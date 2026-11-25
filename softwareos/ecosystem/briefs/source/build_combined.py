"""Combine the four architecture briefs into one document with a cover page and continuous page numbers.

Run from this folder:  python3 build_combined.py
Then print 2026-11-22-zikaron-basalon-architecture.html to PDF with headless Chrome.
"""
import re
from pathlib import Path

HERE = Path(__file__).parent
PARTS = [  # (file, title, one-line summary)
    ("2026-11-22-aws-architecture.html", "חשבון ה-AWS",
     "כל מה שיש בחשבון: 6 סביבות Elastic Beanstalk, 4 מסדי נתונים, הודעות, מסירה, רשת, אבטחה, ומלאי מלא של המשאבים."),
    ("2026-11-22-backend-architecture.html", "ה-backend",
     "ה-API, מסד הנתונים וחדר הדואר: איך הם מחוברים, איך בקשה עוברת במערכת, ומה מוגן ומה חסר."),
    ("2026-11-22-frontend-architecture.html", "ה-frontend — האתר הציבורי",
     "האתר למארחים, לאורחים ולעדים: מה יושב ב-S3, מה רץ בדפדפן, האזורים באתר, ומה חסר."),
    ("2026-11-22-admin-portal-architecture.html", "פורטל הניהול",
     "אפליקציית הצוות: איך היא מתארחת ב-Amplify, מי רואה מה לפי תפקיד, איך משבצים עד, ומה חסר."),
]
OUT = HERE / "2026-11-22-zikaron-basalon-architecture.html"

styles, pages, toc = [], [], []
page_no = 1  # the cover is page 1
for file, title, summary in PARTS:
    html = (HERE / file).read_text(encoding="utf-8")
    styles += re.findall(r"<style>(.*?)</style>", html, re.S)
    sections = re.findall(r'<section class="page">.*?</section>', html, re.S)
    toc.append((title, summary, page_no + 1, len(sections)))
    pages += sections
    page_no += len(sections)

total = page_no
numbered = []
for i, sec in enumerate(pages, start=2):
    sec = re.sub(r"עמוד \d+ מתוך \d+", f"עמוד {i} מתוך {total}", sec)
    numbered.append(sec)

toc_rows = "\n".join(
    f'''      <div class="toc-row">
        <span class="toc-n">{n}</span>
        <div><b>{t}</b><span>{s}</span></div>
        <span class="toc-p">עמודים <span dir="ltr">{p}–{p + c - 1}</span></span>
      </div>''' for n, (t, s, p, c) in enumerate(toc, start=1))

cover = f'''<section class="page cover">
  <div class="top">
    <div>
      <h1>זיכרון בסלון — <em>ארכיטקטורה</em></h1>
      <p class="sub">המערכת החיה כפי שהיא רצה היום: חשבון ה-AWS, ה-backend, האתר הציבורי ופורטל הניהול</p>
    </div>
    <div class="meta"><b>סביבת production</b> · eu-west-3<br>22.11.2026 · Moveo · עמוד 1 מתוך {total}</div>
  </div>

  <div class="cover-body">
    <div class="cover-lead">
      <p>זיכרון בסלון פועלת עונה אחת בשנה. <b>מארחים</b> פותחים את הבית שלהם לסלון, <b>אורחים</b> מוצאים סלון על המפה ונרשמים, ו<b>הצוות</b> משבץ עד לכל סלון. שיא הפעילות הוא בשבועות שלפני יום השואה.</p>
      <p>התוכנה היא <b>API אחד ב-Django</b> עם <b>שתי אפליקציות React</b> מולו, ו"חדר דואר" קטן של תורים ו-Lambdas ב-AWS. כל המסמך נבדק מול הקוד ומול החשבון החי ב-22.11.2026, בקריאה בלבד.</p>
    </div>

    <h2>מה במסמך</h2>
    <div class="toc">
{toc_rows}
    </div>

    <div class="cover-grid">
      <div class="card red">
        <h3>שלושה דברים לדעת לפני שנוגעים במשהו</h3>
        <ol>
          <li><b>אסור למחוק את <code>Zikaron-basalon-be-production</code> ואת <code>…-be-development</code>.</b> הן לא מקבלות תעבורה, אבל הן הבעלים של מסדי הנתונים.</li>
          <li><b>ההתראות כבויות בכוונה מחוץ לעונה,</b> על ידי עריכת קוד ב-Lambdas. צריך להחזיר אותן ידנית לפני העונה.</li>
          <li><b>ההרשאות לפי תפקיד נאכפות רק בדפדפן.</b> ה-API הוא הבדיקה האמיתית היחידה, והוא נכשל לכיוון הפתוח.</li>
        </ol>
      </div>
      <div class="card">
        <h3>איך לקרוא את המסמך</h3>
        כל חלק בנוי משלושה עמודים: <b>איך זה עובד</b> (תרשים עם מספרים), <b>איך זה מתנהג</b> (זרימה או טבלאות), ו-<b>מה מוגן, מה חסר ומה להחלטה</b>.
        <div class="legend" style="margin-top:8px;flex-wrap:wrap">
          <span><i></i> קיים ורץ</span>
          <span><i class="a"></i> כבוי מחוץ לעונה</span>
          <span><i class="r"></i> סיכון או שבור</span>
        </div>
      </div>
    </div>
  </div>

  <div class="foot"><span>Zikaron BaSalon · ארכיטקטורה</span><span>מזהה החשבון, כתובות IP ושמות מארחים פנימיים הושמטו בכוונה</span></div>
</section>'''

cover_css = """
.cover-body { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; flex: 1; }
.cover-lead { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; font-size: 13px; line-height: 1.6; color: var(--body); }
.cover-lead p { margin: 0; }
.toc { display: grid; gap: 8px; }
.toc-row { display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 14px; border: 1px solid var(--line); border-radius: 8px; padding: 10px 14px; }
.toc-row b { display: block; font-size: 15px; color: var(--navy); }
.toc-row span { font-size: 12px; color: var(--muted); }
.toc-n { width: 30px; height: 30px; border-radius: 50%; background: var(--teal); color: #fff; font-weight: 700; font-size: 15px; display: inline-flex; align-items: center; justify-content: center; }
.toc-p { font-size: 12px; color: var(--ink); font-weight: 600; white-space: nowrap; }
.cover-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 18px; margin-top: 4px; }
"""

doc = f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>זיכרון בסלון · ארכיטקטורה</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="brief.css">
<style>{"".join(dict.fromkeys(styles))}{cover_css}</style>
</head>
<body>
{cover}
{chr(10).join(numbered)}
</body>
</html>
'''
OUT.write_text(doc, encoding="utf-8")
print(f"wrote {OUT.name}: {total} pages")
