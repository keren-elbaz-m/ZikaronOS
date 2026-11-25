#!/usr/bin/env bash
# Second read-only pass for Zikaron BaSalon: costs, Lambdas in depth, Amplify, the full
# resource inventory, database safety and other regions.
#
# Run in AWS CloudShell:  bash aws-deep-inventory.sh
# Only list / describe / get calls, with two harmless exceptions:
#   - `iam generate-credential-report` creates the account's IAM credential report;
#   - Cost Explorer charges $0.01 per request (about 8 requests here, so ~$0.08).
# Secret values are never printed: env vars show NAMES only, and Lambda handler code
# and Amplify build specs pass through a redaction filter. Review the output before sharing.
# The output contains bucket names, IAM user names and the account ID. Keep it out of git.

R=eu-west-3
OUT="zikaron-aws-inventory-$(date +%Y%m%d-%H%M).txt"
exec > >(tee "$OUT") 2>&1
h() { printf '\n===== %s =====\n' "$1"; }
redact() { python3 -c '
import re, sys
t = sys.stdin.read()
t = re.sub(r"SG\.[\w.-]{10,}", "<REDACTED>", t)
t = re.sub(r"AKIA[0-9A-Z]{16}", "<REDACTED>", t)
t = re.sub(r"(?i)((?:api[_-]?key|token|secret|password|passwd|authorization|bearer)\w*[\"\x27]?\s*[:=]\s*[\"\x27])([^\"\x27]+)", r"\1<REDACTED>", t)
t = re.sub(r"([\"\x27])[A-Za-z0-9_/+=.-]{32,}\1", r"\1<REDACTED>\1", t)
sys.stdout.write(t)'; }
money() { jq -r "$1"; }

# ---------------------------------------------------------------- costs
END=$(date +%Y-%m-01); TODAY=$(date +%Y-%m-%d)
START12=$(date -d "$END -12 month" +%Y-%m-%d); START3=$(date -d "$END -3 month" +%Y-%m-%d); START1=$(date -d "$END -1 month" +%Y-%m-%d)
CE="aws ce --region us-east-1"
AMT='(.Amount|tonumber*100|round/100)'

h "A1. Total AWS cost per month, last 12 full months (USD, unblended)"
$CE get-cost-and-usage --time-period Start=$START12,End=$END --granularity MONTHLY --metrics UnblendedCost --output json |
  jq -r ".ResultsByTime[] | \"\(.TimePeriod.Start)  \(.Total.UnblendedCost | $AMT)\""
if [ "$TODAY" != "$END" ]; then
  h "A1b. Month to date ($END to $TODAY)"
  $CE get-cost-and-usage --time-period Start=$END,End=$TODAY --granularity MONTHLY --metrics UnblendedCost --output json |
    jq -r ".ResultsByTime[] | \"\(.Total.UnblendedCost | $AMT)\""
fi

h "A2. Cost by service, last 3 full months"
$CE get-cost-and-usage --time-period Start=$START3,End=$END --granularity MONTHLY --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE --output json |
  jq -r ".ResultsByTime[] | \"-- \(.TimePeriod.Start)\", (.Groups | map(select((.Metrics.UnblendedCost.Amount|tonumber) >= 0.01)) | sort_by(-(.Metrics.UnblendedCost.Amount|tonumber))[] | \"  \(.Metrics.UnblendedCost | $AMT)\t\(.Keys[0])\")"

h "A3. Cost by region, last 3 full months"
$CE get-cost-and-usage --time-period Start=$START3,End=$END --granularity MONTHLY --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=REGION --output json |
  jq -r ".ResultsByTime[] | \"-- \(.TimePeriod.Start)\", (.Groups | map(select((.Metrics.UnblendedCost.Amount|tonumber) >= 0.01)) | sort_by(-(.Metrics.UnblendedCost.Amount|tonumber))[] | \"  \(.Metrics.UnblendedCost | $AMT)\t\(.Keys[0])\")"

h "A4. Top 50 usage types, last full month ($START1)"
$CE get-cost-and-usage --time-period Start=$START1,End=$END --granularity MONTHLY --metrics UnblendedCost UsageQuantity \
  --group-by Type=DIMENSION,Key=USAGE_TYPE --output json |
  jq -r ".ResultsByTime[0].Groups | map(select((.Metrics.UnblendedCost.Amount|tonumber) >= 0.01)) | sort_by(-(.Metrics.UnblendedCost.Amount|tonumber))[:50][] | \"  \(.Metrics.UnblendedCost | $AMT)\t\(.Keys[0])\t(qty \(.Metrics.UsageQuantity.Amount|tonumber|round))\""

h "A5. Credits, refunds, tax: last 12 months by record type"
$CE get-cost-and-usage --time-period Start=$START12,End=$END --granularity MONTHLY --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=RECORD_TYPE --output json |
  jq -r ".ResultsByTime[] | .TimePeriod.Start as \$m | .Groups[] | \"  \(\$m)\t\(.Keys[0])\t\(.Metrics.UnblendedCost | $AMT)\""

h "A6. Forecast to end of this month"
NEXT=$(date -d "$END +1 month" +%Y-%m-%d)
$CE get-cost-forecast --time-period Start=$TODAY,End=$NEXT --granularity MONTHLY --metric UNBLENDED_COST \
  --query 'Total.Amount' --output text 2>&1

h "A7. Billing setup: organization, budgets, reservations"
ACC=$(aws sts get-caller-identity --query Account --output text)
aws organizations describe-organization --query 'Organization.{MasterAccount:MasterAccountId,FeatureSet:FeatureSet}' --output text 2>&1 | head -2
aws budgets describe-budgets --account-id "$ACC" --query 'Budgets[].[BudgetName,BudgetLimit.Amount,CalculatedSpend.ActualSpend.Amount]' --output text 2>&1
aws rds describe-reserved-db-instances --region $R --query 'ReservedDBInstances[].[DBInstanceClass,State,StartTime,Duration]' --output text
aws ec2 describe-reserved-instances --region $R --query 'ReservedInstances[].[InstanceType,State,End]' --output text
aws savingsplans describe-savings-plans --query 'savingsPlans[].[savingsPlanType,state,commitment,end]' --output text 2>&1

# ---------------------------------------------------------------- lambdas
h "B. Lambda functions in depth ($R)"
for fn in $(aws lambda list-functions --region $R --query 'Functions[].FunctionName' --output text); do
  h "B. Lambda $fn"
  aws lambda get-function-configuration --region $R --function-name "$fn" --output json |
    jq -r '"runtime=\(.Runtime) handler=\(.Handler) timeout=\(.Timeout)s memory=\(.MemorySize)MB arch=\(.Architectures|join(",")) lastModified=\(.LastModified)",
           "role=\(.Role|split("/")|last)  vpc=\(.VpcConfig.VpcId // "none")  dlq=\(.DeadLetterConfig.TargetArn // "none" | split(":") | last)",
           "layers=\([.Layers[]?.Arn | split(":")[-2]] | join(","))",
           "env var names: \((.Environment.Variables // {}) | keys | join(", "))"'
  echo "reserved concurrency: $(aws lambda get-function-concurrency --region $R --function-name "$fn" --query ReservedConcurrentExecutions --output text)"
  aws lambda get-policy --region $R --function-name "$fn" --query Policy --output text 2>/dev/null |
    jq -r '.Statement[] | "invoke allowed: \(.Principal.Service // .Principal.AWS // .Principal) from \((.Condition.ArnLike."AWS:SourceArn" // "-") | split(":") | last)"'
  role=$(aws lambda get-function-configuration --region $R --function-name "$fn" --query Role --output text | awk -F/ '{print $NF}')
  echo "role managed policies: $(aws iam list-attached-role-policies --role-name "$role" --query 'AttachedPolicies[].PolicyName' --output text)"
  echo "role inline policies:  $(aws iam list-role-policies --role-name "$role" --query PolicyNames --output text)"
  for m in Invocations Errors Throttles; do
    v=$(aws cloudwatch get-metric-statistics --region $R --namespace AWS/Lambda --metric-name $m --dimensions Name=FunctionName,Value="$fn" \
      --start-time "$(date -u -d '-30 day' +%FT%TZ)" --end-time "$(date -u +%FT%TZ)" --period 2592000 --statistics Sum --query 'Datapoints[0].Sum' --output text)
    echo "last 30 days $m: $v"
  done
  aws cloudwatch get-metric-statistics --region $R --namespace AWS/Lambda --metric-name Duration --dimensions Name=FunctionName,Value="$fn" \
    --start-time "$(date -u -d '-30 day' +%FT%TZ)" --end-time "$(date -u +%FT%TZ)" --period 2592000 --statistics Average Maximum \
    --query 'Datapoints[0].[Average,Maximum]' --output text | sed 's/^/last 30 days duration ms avg\/max: /'
  url=$(aws lambda get-function --region $R --function-name "$fn" --query Code.Location --output text)
  rm -rf /tmp/lz && mkdir -p /tmp/lz && curl -s -o /tmp/lz/code.zip "$url"
  echo "code: top-level entries (dependencies are folders):"
  unzip -Z1 /tmp/lz/code.zip | cut -d/ -f1 | sort -u | tr '\n' ' '; echo
  mod=$(aws lambda get-function-configuration --region $R --function-name "$fn" --query Handler --output text | sed 's/\.[^.]*$//')
  for f in $(unzip -Z1 /tmp/lz/code.zip | grep -E '^[^/]+\.(py|js|mjs)$'); do
    echo "----- $f (redacted) -----"
    unzip -p /tmp/lz/code.zip "$f" | redact
  done
  echo "(handler module: $mod)"
  rm -rf /tmp/lz
done

# ---------------------------------------------------------------- amplify
h "C. Amplify apps"
for ar in $R us-east-1 eu-central-1 eu-west-1; do
  for app in $(aws amplify list-apps --region $ar --query 'apps[].appId' --output text 2>/dev/null); do
    echo "[region $ar]"
    aws amplify get-app --region $ar --app-id "$app" --output json |
      jq -r '.app | "app \(.name)  platform=\(.platform)  repo=\(.repository)  created=\(.createTime)  updated=\(.updateTime)",
             "  app env var names: \((.environmentVariables // {}) | keys | join(", "))",
             "  rewrite/redirect rules: \(.customRules | length)"'
    echo "  build spec (redacted):"
    aws amplify get-app --region $ar --app-id "$app" --query app.buildSpec --output text | redact | sed 's/^/    /'
    for br in $(aws amplify list-branches --region $ar --app-id "$app" --query 'branches[].branchName' --output text); do
      aws amplify get-branch --region $ar --app-id "$app" --branch-name "$br" --output json |
        jq -r '.branch | "  branch \(.branchName)  stage=\(.stage)  autoBuild=\(.enableAutoBuild)  framework=\(.framework)  env var names: \((.environmentVariables // {}) | keys | join(", "))"'
      aws amplify list-jobs --region $ar --app-id "$app" --branch-name "$br" --max-results 5 \
        --query 'jobSummaries[].[status,startTime,commitId]' --output text | sed 's/^/    job /'
    done
    aws amplify list-domain-associations --region $ar --app-id "$app" \
      --query 'domainAssociations[].[domainName,domainStatus,join(`,`,subDomains[].subDomainSetting.prefix)]' --output text | sed 's/^/  domain /'
  done
done

# ---------------------------------------------------------------- compute & network
h "D1. EB environments: what each one actually runs"
for env in $(aws elasticbeanstalk describe-environments --region $R --query 'Environments[].EnvironmentName' --output text); do
  res=$(aws elasticbeanstalk describe-environment-resources --region $R --environment-name "$env" \
    --query 'EnvironmentResources.[length(Instances), LoadBalancers[0].Name]' --output text)
  echo "$env  running_instances+lb: $res"
done
h "D2. EB coupled databases (deletion policy decides what happens to the DB if the env is terminated)"
for pair in $(aws elasticbeanstalk describe-environments --region $R --query 'Environments[].[ApplicationName,EnvironmentName]' --output text | tr '\t' ':'); do
  app=${pair%%:*}; env=${pair#*:}
  aws elasticbeanstalk describe-configuration-settings --region $R --application-name "$app" --environment-name "$env" --output json |
    jq -r --arg e "$env" '.ConfigurationSettings[0].OptionSettings[]
      | select(.Namespace == "aws:rds:dbinstance" and (.OptionName | test("DBDeletionPolicy|HasCoupledDatabase|DBEngineVersion|DBInstanceClass|MultiAZDatabase")))
      | "\($e)  \(.OptionName) = \(.Value // "")"'
done
h "D3. EC2 instances"
aws ec2 describe-instances --region $R \
  --query 'Reservations[].Instances[].[InstanceType,State.Name,LaunchTime,PublicIpAddress!=`null`,Tags[?Key==`elasticbeanstalk:environment-name`]|[0].Value]' --output table
h "D4. Storage, IPs, NAT"
aws ec2 describe-volumes --region $R --query 'Volumes[].[Size,State]' --output text | awk '{n++; s+=$1; if ($2=="available") {u++; us+=$1}} END {print n" EBS volumes, "s" GiB; unattached: "u+0" ("us+0" GiB)"}'
aws ec2 describe-snapshots --owner-ids self --region $R --query 'Snapshots[].VolumeSize' --output text | tr '\t' '\n' | awk 'NF {n++; s+=$1} END {print n+0" EBS snapshots, "s+0" GiB"}'
aws ec2 describe-addresses --region $R --query 'Addresses[].AssociationId' --output text | tr '\t' '\n' | awk 'NF {n++; if ($1=="None") u++} END {print n+0" Elastic IPs, unassociated: "u+0}'
aws ec2 describe-nat-gateways --region $R --query 'NatGateways[].[State,CreateTime]' --output text | sed 's/^/NAT gateway /'
aws ec2 describe-vpcs --region $R --query 'Vpcs[].[IsDefault,CidrBlock]' --output text | sed 's/^/VPC default=/'
h "D5. Load balancers -> EB environment"
for lb in $(aws elbv2 describe-load-balancers --region $R --query 'LoadBalancers[].LoadBalancerArn' --output text); do
  aws elbv2 describe-tags --region $R --resource-arns "$lb" --output json |
    jq -r '.TagDescriptions[0] | "\(.ResourceArn | split("/")[1:3] | join("/"))  env=\([.Tags[] | select(.Key == "elasticbeanstalk:environment-name") | .Value][0] // "-")"'
done
h "D6. Regional WAF attachments"
aws wafv2 list-web-acls --scope REGIONAL --region $R --query 'WebACLs[].[Name,ARN]' --output text |
  while read -r n arn; do
    echo "$n -> $(aws wafv2 list-resources-for-web-acl --region $R --web-acl-arn "$arn" --resource-type APPLICATION_LOAD_BALANCER --query 'ResourceArns[]' --output text | tr '\t' '\n' | awk -F/ 'NF {print $3}' | tr '\n' ' ')"
  done

# ---------------------------------------------------------------- databases
h "E1. RDS details"
aws rds describe-db-instances --region $R \
  --query 'DBInstances[].[DBInstanceIdentifier,InstanceCreateTime,StorageType,AllocatedStorage,MaxAllocatedStorage,DeletionProtection,EngineLifecycleSupport,PerformanceInsightsEnabled,AutoMinorVersionUpgrade]' --output table
h "E2. RDS network exposure (who can reach each DB)"
aws rds describe-db-instances --region $R --output json |
  jq -r '.DBInstances[] | .DBInstanceIdentifier as $d | .VpcSecurityGroups[].VpcSecurityGroupId | "\($d) \(.)"' |
  while read -r d sg; do
    aws ec2 describe-security-groups --region $R --group-ids "$sg" --output json |
      jq -r --arg d "$d" '.SecurityGroups[].IpPermissions[] | "\($d): ports \(.FromPort // "all")-\(.ToPort // "all") from \([.IpRanges[].CidrIp, .Ipv6Ranges[].CidrIpv6, (.UserIdGroupPairs[] | "security-group")] | join(","))"'
  done
h "E3. RDS blue/green deployments"
aws rds describe-blue-green-deployments --region $R \
  --query 'BlueGreenDeployments[].[BlueGreenDeploymentName,Status,StatusDetails,CreateTime]' --output text
h "E4. RDS snapshots"
aws rds describe-db-snapshots --region $R --query 'DBSnapshots[].[SnapshotType,AllocatedStorage]' --output text |
  awk '{n[$1]++; s[$1]+=$2} END {for (t in n) print t": "n[t]" snapshots, "s[t]" GiB"}'

# ---------------------------------------------------------------- s3
h "F. S3 buckets: region, size, public-access block"
for b in $(aws s3api list-buckets --query 'Buckets[].Name' --output text); do
  loc=$(aws s3api get-bucket-location --bucket "$b" --query LocationConstraint --output text 2>/dev/null)
  [ "$loc" = "None" ] && loc=us-east-1
  size=$(aws cloudwatch get-metric-statistics --region "$loc" --namespace AWS/S3 --metric-name BucketSizeBytes \
    --dimensions Name=BucketName,Value="$b" Name=StorageType,Value=StandardStorage \
    --start-time "$(date -u -d '-3 day' +%FT%TZ)" --end-time "$(date -u +%FT%TZ)" --period 86400 --statistics Average \
    --query 'Datapoints[0].Average' --output text 2>/dev/null)
  gb=$(awk -v s="$size" 'BEGIN { if (s ~ /^[0-9.eE+]+$/) printf "%.2f", s/1073741824; else print "?" }')
  pab=$(aws s3api get-public-access-block --bucket "$b" --query 'PublicAccessBlockConfiguration.[BlockPublicAcls,BlockPublicPolicy,IgnorePublicAcls,RestrictPublicBuckets]' --output text 2>/dev/null | tr '\t' ',')
  echo "$b  region=$loc  sizeGB=$gb  publicAccessBlock=${pab:-NONE}"
done

# ---------------------------------------------------------------- other services
h "G1. Secrets Manager (names only)"
aws secretsmanager list-secrets --region $R --query 'SecretList[].[Name,LastAccessedDate,LastChangedDate]' --output text
h "G2. Certificates"
for cr in $R us-east-1; do
  for c in $(aws acm list-certificates --region $cr --query 'CertificateSummaryList[].CertificateArn' --output text); do
    aws acm describe-certificate --region $cr --certificate-arn "$c" \
      --query 'Certificate.[DomainName,Status,NotAfter,length(InUseBy),RenewalEligibility]' --output text | sed "s/^/[$cr] /"
  done
done
h "G3. CloudTrail, GuardDuty, SNS, Backup"
aws cloudtrail describe-trails --region $R --query 'trailList[].[Name,IsMultiRegionTrail,HomeRegion]' --output text
aws guardduty list-detectors --region $R --query 'DetectorIds' --output text | sed 's/^/guardduty detectors: /'
aws sns list-topics --region $R --query 'Topics[].TopicArn' --output text | tr '\t' '\n' | awk -F: 'NF {print "sns topic: "$NF}'
aws backup list-backup-plans --region $R --query 'BackupPlansList[].BackupPlanName' --output text | sed 's/^/backup plan: /'
h "G4. IAM users and keys (credential report)"
aws iam generate-credential-report >/dev/null 2>&1; sleep 8
aws iam get-credential-report --query Content --output text | base64 -d |
  awk -F, 'NR==1 {print "user,password_enabled,password_last_used,mfa,key1_active,key1_last_used,key2_active,key2_last_used"; next}
           {print $1","$4","$5","$8","$9","$11","$14","$16}'

# ---------------------------------------------------------------- other regions
h "H. Other regions (anything left running?)"
for r2 in eu-central-1 eu-west-1 us-east-1 il-central-1; do
  echo "--- $r2"
  aws elasticbeanstalk describe-environments --region $r2 --query 'Environments[].[EnvironmentName,Status]' --output text 2>&1 | head -5
  echo "running EC2: $(aws ec2 describe-instances --region $r2 --filters Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceType' --output text 2>&1)"
  echo "RDS: $(aws rds describe-db-instances --region $r2 --query 'DBInstances[].DBInstanceClass' --output text 2>&1)"
  echo "Lambda: $(aws lambda list-functions --region $r2 --query 'Functions[].FunctionName' --output text 2>&1)"
done

h "Done"
echo "Saved to $OUT. Review it, then download it (Actions -> Download file)."
