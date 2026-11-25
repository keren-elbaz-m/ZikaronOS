#!/usr/bin/env bash
# Read-only AWS checks for the Zikaron BaSalon legacy infrastructure.
# Answers the "Verify in the AWS console" list in
# softwareos/products/platform/legacy-baseline/infrastructure-and-runtime.md.
#
# Run in AWS CloudShell (region eu-west-3):  bash aws-readonly-check.sh
# Only list / describe / get calls. Nothing is created, changed or deleted.
# Secret values are never printed: environment variables show their NAME only,
# except the non-secret names in SAFE below.

R=eu-west-3
OUT="zikaron-aws-check-$(date +%Y%m%d-%H%M).txt"
SAFE='^(DJANGO_DEBUG|IS_LOCAL|NODE_ENV|AWS_REGION|WHATSAPP_ENABLED|DOMAIN|DB_HOST|DB_PORT|DB_NAME|REACT_APP_API_URL|REACT_APP_FE_URL|REACT_APP_ORTHODOX_MODE)$'
exec > >(tee "$OUT") 2>&1
h() { printf '\n===== %s =====\n' "$1"; }

h "0. Who am I / account security"
aws sts get-caller-identity --query Arn --output text
aws iam get-account-summary --query 'SummaryMap.{RootMFA:AccountMFAEnabled,RootAccessKeys:AccountAccessKeysPresent,Users:Users}' --output table

h "1. Elastic Beanstalk environments"
aws elasticbeanstalk describe-environments --region $R \
  --query 'Environments[].[ApplicationName,EnvironmentName,Status,Health,CNAME,PlatformArn,DateUpdated]' --output table
for pair in $(aws elasticbeanstalk describe-environments --region $R --query 'Environments[].[ApplicationName,EnvironmentName]' --output text | tr '\t' ':'); do
  app=${pair%%:*}; env=${pair#*:}
  h "1-2. $env: capacity, load balancer, env var names"
  aws elasticbeanstalk describe-configuration-settings --region $R --application-name "$app" --environment-name "$env" --output json |
    jq -r --arg safe "$SAFE" '.ConfigurationSettings[0].OptionSettings[]
      | select(.Namespace | test("autoscaling:asg|launchconfiguration|ec2:instances|elasticbeanstalk:environment|elbv2:loadbalancer|elbv2:listener|application:environment"))
      | if .Namespace == "aws:elasticbeanstalk:application:environment" then
          "env  \(.OptionName) = " + (if (.OptionName | test($safe)) then (.Value // "")
                                     elif ((.Value // "") == "") then "<EMPTY>" else "<set, hidden>" end)
        else "\(.Namespace) \(.OptionName) = \(.Value // "")" end'
done

h "3. CloudWatch alarms (INSUFFICIENT_DATA = alarm gets no data)"
aws cloudwatch describe-alarms --region $R --query 'MetricAlarms[].[AlarmName,StateValue,Namespace,MetricName,Period]' --output table

h "4. Latest EB bundles (a size of ~26 MB or more suggests latest.dump is inside)"
aws elasticbeanstalk describe-application-versions --region $R --max-records 5 \
  --query 'ApplicationVersions[].[ApplicationName,VersionLabel,DateCreated,SourceBundle.S3Bucket,SourceBundle.S3Key]' --output text |
  while read -r app label date b k; do
    size=$(aws s3api head-object --bucket "$b" --key "$k" --query ContentLength --output text 2>/dev/null)
    echo "$app  $label  $date  size_bytes=${size:-unknown}"
  done

h "5. Route 53 records (TXT skipped)"
for z in $(aws route53 list-hosted-zones --query 'HostedZones[].Id' --output text); do
  aws route53 list-resource-record-sets --hosted-zone-id "$z" \
    --query 'ResourceRecordSets[?Type!=`TXT`].[Name,Type,AliasTarget.DNSName,ResourceRecords[0].Value]' --output text
done
h "5. CloudFront distributions"
aws cloudfront list-distributions \
  --query 'DistributionList.Items[].[Id,DomainName,join(`,`,Aliases.Items || `[]`),join(`,`,Origins.Items[].DomainName),WebACLId,Enabled]' --output text
h "5. S3 buckets"
aws s3api list-buckets --query 'Buckets[].Name' --output text | tr '\t' '\n'

h "6. WAF web ACLs (looking for a custom 450 response)"
for spec in "CLOUDFRONT us-east-1" "REGIONAL $R"; do
  set -- $spec
  aws wafv2 list-web-acls --scope "$1" --region "$2" --query 'WebACLs[].[Name,Id]' --output text |
    while read -r n id; do
      echo "[$1] $n"
      aws wafv2 get-web-acl --scope "$1" --region "$2" --name "$n" --id "$id" --output json |
        jq -r '"  default=\(.WebACL.DefaultAction | keys[0])",
               (.WebACL.Rules[] | "  rule \(.Name) action=\((.Action // .OverrideAction) | keys[0]) code=\(.Action.Block.CustomResponse.ResponseCode // "-")")'
    done
done
h "6. CloudFront functions"
aws cloudfront list-functions --query 'FunctionList.Items[].[Name,Status]' --output text
h "6. Load balancers: listeners, idle timeout, fixed responses"
for lb in $(aws elbv2 describe-load-balancers --region $R --query 'LoadBalancers[].LoadBalancerArn' --output text); do
  echo "LB ${lb##*/loadbalancer/}"
  aws elbv2 describe-load-balancer-attributes --region $R --load-balancer-arn "$lb" \
    --query "Attributes[?Key=='idle_timeout.timeout_seconds'].Value" --output text | sed 's/^/  idle_timeout_seconds=/'
  for l in $(aws elbv2 describe-listeners --region $R --load-balancer-arn "$lb" --query 'Listeners[].ListenerArn' --output text); do
    aws elbv2 describe-listeners --region $R --listener-arns "$l" --query 'Listeners[0].[Port,Protocol]' --output text | sed 's/^/  listener /'
    aws elbv2 describe-rules --region $R --listener-arn "$l" \
      --query 'Rules[].Actions[?Type==`fixed-response`].FixedResponseConfig.StatusCode' --output text | sed 's/^/  fixed-response /'
  done
done

h "7. EventBridge Scheduler (no payloads printed)"
for g in $(aws scheduler list-schedule-groups --region $R --query 'ScheduleGroups[].Name' --output text); do
  for s in $(aws scheduler list-schedules --region $R --group-name "$g" --query 'Schedules[].Name' --output text); do
    aws scheduler get-schedule --region $R --group-name "$g" --name "$s" \
      --query '[Name,State,ScheduleExpression,ScheduleExpressionTimezone,Target.Arn]' --output text
  done
done
h "7. EventBridge rules"
aws events list-rules --region $R --query 'Rules[].[Name,State,ScheduleExpression]' --output text

h "8. Lambda functions (no env values, no code)"
aws lambda list-functions --region $R \
  --query 'Functions[].[FunctionName,Runtime,Handler,CodeSize,Timeout,MemorySize,LastModified]' --output table
h "8. Lambda triggers"
aws lambda list-event-source-mappings --region $R \
  --query 'EventSourceMappings[].[FunctionArn,EventSourceArn,BatchSize,State,join(`,`,FunctionResponseTypes || `[]`)]' --output text
h "8. SQS queues"
for q in $(aws sqs list-queues --region $R --query 'QueueUrls[]' --output text); do
  echo "$q"
  aws sqs get-queue-attributes --region $R --queue-url "$q" \
    --attribute-names VisibilityTimeout MessageRetentionPeriod RedrivePolicy ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
    --query Attributes --output json
done

h "9. RDS"
aws rds describe-db-instances --region $R \
  --query 'DBInstances[].[DBInstanceIdentifier,Engine,EngineVersion,DBInstanceClass,MultiAZ,BackupRetentionPeriod,StorageEncrypted,PubliclyAccessible,AllocatedStorage]' --output table

h "10. CodePipeline"
for p in $(aws codepipeline list-pipelines --region $R --query 'pipelines[].name' --output text); do
  echo "pipeline $p"
  aws codepipeline get-pipeline --region $R --name "$p" --output json |
    jq -r '.pipeline.stages[] | .name as $s | .actions[]
      | "  \($s): \(.actionTypeId.provider) \(.configuration.FullRepositoryId // .configuration.Repo // "") \(.configuration.BranchName // .configuration.Branch // "") \(.configuration.ProjectName // .configuration.ApplicationName // .configuration.BucketName // "") \(.configuration.EnvironmentName // "")"'
done
h "10. CodeBuild projects (env var names; values only for SAFE names)"
names=$(aws codebuild list-projects --region $R --query 'projects[]' --output text)
if [ -n "$names" ]; then
  aws codebuild batch-get-projects --region $R --names $names --output json |
    jq -r --arg safe "$SAFE" '.projects[]
      | "\(.name)  source=\(.source.location // .source.type)  image=\(.environment.image)  buildspec=\(if ((.source.buildspec // "") | contains("\n")) then "inline" else (.source.buildspec // "default") end)",
        (.environment.environmentVariables[]? | "  \(.name) [\(.type)] = " + (if (.name | test($safe)) then .value else "<hidden>" end))'
fi

h "11. CloudWatch log groups"
aws logs describe-log-groups --region $R --query 'logGroups[].[logGroupName,retentionInDays,storedBytes]' --output text

h "Done"
echo "Saved to $OUT"
