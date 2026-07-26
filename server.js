const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: "*" } 
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'display.html'));
});
app.get('/display.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'display.html'));
});

const TARGET_SCORE = 15;  
const MAX_QUESTIONS = 25;
// חלון חסד לחיבור מחדש: כשטלפון ננעל / הרשת נופלת לרגע, לא מוחקים את השחקן מיד
const DISCONNECT_GRACE_MS = Number(process.env.DISCONNECT_GRACE_MS) || 60000;

const rawQuestions = [
  "מי יראה את הפח מלא ויצא לזרוק אותו?",
  "מי תמיד יגיד עליך מילה טובה?",
  "מי אף פעם לא יעביר עליך ביקורת?",
  "מי הראשון שיבוא לעזור לך לעבור דירה בלי לבקש תמורה?",
  "מי תמיד יזכור לשאול לשלומך כשהוא יודע שעברת שבוע קשה?",
  "למי יש את המאור פנים והחיוך הכי מדבק?",
  "מי תמיד יסנגר עליך כשאחרים מדברים?",
  "מי הכי יפרגן לך מכל הלב כשתצליח במשהו?",
  "מי תמיד יביא איתו אנרגיה חיובית וטובה לכל חדר שהוא נכנס אליו?",
  "מי יכין לך כוס תה או קפה בדיוק כפי שאתה אוהב בלי שבכלל תבקש?",
  "למי יש את הלב הכי רחב בחדר?",
  "מי תמיד ידע למצוא את המילים הנכונות כדי להרגיע ולנחם?",
  "מי תמיד יציע טרמפ למי שצריך, גם אם זה לא בדרך שלו?",
  "מי יזכור בדיוק איזה אוכל אתה אוהב וידאג שיהיה אותו באירוע?",
  "מי הכי טוב בהקשבה אמיתית בלי לקטוע?",
  "מי תמיד יזכור ימי הולדת ואירועים חשובים של כולם?",
  "על מי אפשר לסמוך בעיניים עצומות בסיטואציה מורכבת?",
  "מי תמיד יראה את הטוב בכל אדם, גם כשקשה לראות?",
  "מי ידאג לנקות ולסדר בסוף המפגש כשכולם כבר עייפים?",
  "מי תמיד ישמח למארח מכל הלב ויתן לך להרגיש בבית?",
  "מי יבחין מיד אם מישהו בקבוצה מרגיש בודד או בצד ויצרף אותו?",
  "למי הכי קל לגשת כדי לבקש עצת חיים טובה?",
  "מי תמיד ישלח הודעה משמחת סתם באמצע היום?",
  "מי הכי יתלהב וייתרגש מהבשורה הטובה שלך?",
  "מי יביא לך אוכל מבושל כשאתה חולה?",
  "מי תמיד שומר על איפוק ורוגע גם כשמסביב יש סערה?",
  "מי יייתן לך את המילה האחרונה רק כדי למנוע ויכוח?",
  "מי הכי סביר שיעזור לזקן לחצות את הכביש או לסחוב קניות?",
  "מי תמיד יגיד תודה רבה מכל הלב לכל מי שנותן לו שירות?",
  "מי יייתן לך להרגיש הכי חשוב בעולם כשהוא מדבר איתך?",
  "מי תמיד מוכן למחול ולסלוח מכל הלב?",
  "מי יפנה מצידו את מקומו כדי שמישהו אחר יישב?",
  "מי הכי דואג לסביבה ולבעלי חיים?",
  "מי יביא את העוגה הכי מושקעת ליום הולדת של חבר?",
  "מי תמיד ישמור עליך וידאג שהגעת הביתה בשלום?",
  "מי תמיד מוצא זמן בשביל אנשים שצריכים אותו?",
  "למי יש את הצחוק הכי אמיתי ומשחרר?",
  "מי תמיד ימצא סיבה לחגוג ולהרים למישהו אחר?",
  "מי יייתן את הנשמה שלו בשביל המשפחה והחברים?",
  "מי תמיד יחפש איך לשפר ולעשות טוב לכולם?",
  "מי הכי סביר שישמור על סוד כמו בכספת?",
  "מי יצליח להעלות לך חיוך על הפנים גם ביום הכי שחור?",
  "מי תמיד יתנדב למשימה שאף אחד אחר לא רוצה לעשות?",
  "מי האדם הכי אמין וישר שאתה מכיר?",
  "מי יחלוק איתך את הנתח הכי טוב באוכל בלי להסס?",
  "מי תמיד ישים את הצרכים של אחרים לפני שלו?",
  "למי יש סבלנות של ברזל להסביר וללמד אחרים?",
  "מי תמיד ישמח לארגן ולהרים אירוע משמח למישהו אחר?",
  "מי יגיד לך את האמת באהבה כשהוא רוצה לטובתך?",
  "מי הופך את העולם הזה למקום קצת יותר טוב פשוט בעצם קיומו?",
  "עם מי כדאי ללכת לשופינג?",
  "מי מחייך הכי הרבה?",
  "למי מתאים לגור בכפר ללא קליטה?",
  "מי יפתור בעיה בדרך שאף אחד לא חשב עליה?",
  "מי יזרום להזמין איתכם פיצה באמצע הלילה?",
  "על מי תוכל לסמוך שישמור לך חודש על הבית?",
  "מי מתפקד הכי טוב בבוקר?",
  "עם מי הכי קשה לקבוע כי 'אין לו זמן'?",
  "מי יודע לצאת מכל מצב הכי טוב?",
  "ליד מי לא כדאי לעבור על הכללים?",
  "למי לא תהיה בעיה להתחזות למקבץ נדבות?",
  "במי אפשר לחשוד שהוא מרגל?",
  "מי ירדם באוטובוס ויתעורר בתחנה אחרונה?",
  "על מי הכי מעניין לעשות סרט דוקומנטרי?",
  "למי מתאים לנסוע עד אילת ולגלות שנדחתה ההופעה?",
  "מי עשה את השינוי הכי משמעותי בשנה האחרונה?",
  "למי הכי מתאים לסגור טיסה מהיום למחר?",
  "הסרטונים של מי יהיו הכי ויראלים?",
  "מי ישרוד הכי טוב בג'ונגל?",
  "מי ידאג לכל החולים למרות שגם הוא חולה?",
  "מי יחזור לסופר להחליף מוצר שפג תוקף?",
  "מי לא יחזור להחליף מוצר עם תקלה?",
  "למי הכי מתאים ללכת למלון ולהביא איתו מצעים מהבית?",
  "למי הכי מתאים ליזום שיחה עם אדם זר באוטובוס?",
  "מי הראשון שיעשה אקזיט?",
  "מי תמיד רואה את חצי הכוס המלאה?",
  "מי יייתן לילדים שלו את הכול ויותר ממה שיש לו?",
  "מי מבין היושבים בחדר הכי סביר שישכח איפה הוא החנה את האוטו?",
  "מי הכי סביר שישרוד על אי בודד?",
  "מי הכי סביר שיאחר באיחור אופנתי לכל אירוע?",
  "מי הכי סביר שיעשה קניות ויקנה הכל חוץ ממה שהוא היה צריך?",
  "מי בחדר הכי סביר שיארגן טיול ספונטני באמצע הלילה?",
  "מי הכי סביר שיירדם באמצע סרט בקולנוע?",
  "מי הכי סביר שישבור את המסך של הטלפון תוך שבוע מקנייתו?",
  "מי הכי סביר שישכח את יום ההולדת של הורה או בן/בת זוג?",
  "מי הכי סביר שיתחיל להתווכח עם שוטר תנועה על דוח?",
  "מי הכי סביר שיבכה בסרט מצויר של דיסני?",
  "מי הכי סביר שישלח הודעה בקבוצה הלא נכונה בווטסאפ?",
  "מי הכי סביר שיהיה מעורב בתאונה קלה בחנייה?",
  "מי הכי סביר שיצליח להסתבך עם החוק בטעות מוחלטת?",
  "מי הכי סביר שיזמין משהו מוזר מאוד במסעדה ויתחרט מיד?",
  "מי הכי סביר שיעזוב הכל ויעבור לגור בחווה מבודדת?",
  "מי הכי סביר שיהפוך למשפיען רשת מפורסם?",
  "מי הכי סביר שיוציא את כל המשכורת שלו ביום שהיא נכנסת?",
  "מי הכי סביר שיביא אוכל מהבית לבית קפה?",
  "מי הכי סביר שיתקע מחוץ לבית בלי מפתחות?",
  "מי הכי סביר שייקח את הבדיחה רחוק מדי?",
  "מי הכי סביר שיקנה משהו רק כי היה עליו מבצע, בלי צורך בו?",
  "מי הכי סביר שישכח את הסיסמה לחשבון הבנק שלו?",
  "מי הכי סביר שיכנס לחדר וישכח למה הוא נכנס?",
  "מי הכי סביר שיאבד את הדרכון שלו יום לפני טיסה?",
  "מי הכי סביר שישתתף בתוכנית ריאליטי?",
  "מי הכי סביר שיחפש את המשקפיים/הטלפון כשהם כבר ביד שלו?",
  "מי הכי סביר שיציע נישואין בשידור חי?",
  "מי הכי סביר שימציא תירוץ מוזר כדי לא לצאת מהבית?",
  "מי הכי סביר שילך לים וישכח להביא מגבת?",
  "מי הכי סביר שיאכל מגש פיצה שלם לבד בלי להניד עפעף?",
  "מי הכי סביר שיגלה שהוא לבש את החולצה הפוך רק בסוף היום?",
  "מי הכי סביר שיתחבר עם בעלי החיים במסיבה במקום עם האנשים?",
  "מי הכי סביר שיירשם לחוג ואחרי שיעור אחד יפסיק ללכת?",
  "מי הכי סביר שישלם על כולם בבית קפה סתם כי הוא במצב רוח טוב?",
  "מי הכי סביר שינסה לתקן משהו בבית בעצמו ויגרום ליותר נזק?",
  "מי הכי סביר שיפול ברחוב וינסה לעשות כאילו זה היה מתוכנן?",
  "מי הכי סביר שישלח הודעה קולית של 5 דקות?",
  "מי הכי סביר שיכנס לדיאטה ואחרי שעתיים יאכל שוקולד?",
  "מי הכי סביר שיכין רשימת קניות מפורטת וישכח אותה בבית?",
  "מי הכי סביר שינסה להצחיק בלוויה?",
  "מי הכי סביר שיתחיל ללמוד שפה חדשה ויפסיק אחרי יומיים?",
  "מי הכי סביר שישאיר את הוויז דולק גם כשהוא נוסע לבית שלו?",
  "מי הכי סביר שישלח סטיקר לא מתאים בקבוצת משפחה?",
  "מי הכי סביר שיצליח לשרוף חביתה?",
  "מי הכי סביר שיגנוב את השלט של הטלוויזיה וישב עליו?",
  "מי הכי סביר שישכח איפה הוא שם את המפתחות של האוטו?",
  "מי הכי סביר שיוציא תואר נוסף סתם בשביל הכיף?",
  "מי הכי סביר שיזמין 5 פריטים באמזון בטעות בלחיצה אחת?",
  "מי הכי סביר שישתה קפה קר ששכב מאתמול?",
  "מי הכי סביר שיריב עם מענה קולי אוטומטי?",
  "מי הכי סביר שיעבור באדום ברגל מול שוטר?",
  "מי הכי סביר שישכח את השם של מישהו שנייה אחרי שהציגו אותו?",
  "מי הכי סביר שיתנדב ראשון לכל משימה?",
  "מי הכי סביר שיקנה ספר עבה וישתמש בו רק בתור מעצור לדלת?",
  "מי הכי סביר שיחליף תמונה בפרופיל כל יומיים?",
  "מי הכי סביר שיתחיל לרקוד באמצע החנות כשיש שיר טוב?",
  "מי הכי סביר שייקח איתו 5 זוגות נעליים לסופ\"ש של יומיים?",
  "מי הכי סביר שידבר מתוך שינה?",
  "מי הכי סביר שיכנס לזום כשהוא עדיין בפיג'מה?",
  "מי הכי סביר שיזכור פרט שולי מלפני 10 שנים?",
  "מי הכי סביר שיספר בדיחה, יצחק ממנה לבד ואף אחד לא יבין?",
  "מי הכי סביר שיעלה על רכבת לכיוון ההפוך?",
  "מי הכי סביר שינסה לפתוח את הדלת של הבית עם השלט של האוטו?",
  "מי הכי סביר שיקנה בגד קטן במידה אחת 'בשביל כשאני ארד במשקל'?",
  "מי הכי סביר שיסרב לבקש הכוונה ויסע במעגלים שעה?",
  "מי הכי סביר שייקח את האוכל שנשאר לכולם בצלחת?",
  "מי הכי סביר שישכח את המטען של הטלפון בכל מלון?",
  "מי הכי סביר שיעשה קעקוע ספונטני בטיול בחו\"ל?",
  "מי הכי סביר שיתלונן שחם לו ואחרי דקה שקר לו?",
  "מי הכי סביר שיתחיל לבנות משהו מאיקאה בלי לקרוא את ההוראות?",
  "מי הכי סביר שיענה להודעה אחרי שלושה ימים ב'חחח'?",
  "מי הכי סביר שישלם על מינוי למכון כושר ולא ידרך שם שנה?",
  "מי הכי סביר שינסה להבריח אוכל לקולנוע בתוך המעיל?",
  "מי הכי סביר שישב בסלון עם משקפי שמש?",
  "מי הכי סביר שישיר במקלחת בקול רם מדי?",
  "מי הכי סביר שיפתח קבוצת ווטסאפ בשביל אירוע של שעה?",
  "מי הכי סביר שימציא מילה חדשה ויצפה שכולם ישתמשו בה?",
  "מי הכי סביר שישים מלח במקום סוכר בקפה?",
  "מי הכי סביר שיתעלם מאזהרת 'דלת רטובה' ויגע בה?",
  "מי הכי סביר שיקנה גאדג'ט מיותר מפרסומת בפייסבוק?",
  "מי הכי סביר שינהל שיחה שלמה עם חתול ברחוב?",
  "מי הכי סביר שישבור כוס זכוכית במסעדה?",
  "מי הכי סביר שיתחפש בפורים בתחפושת הכי מושקעת מכולם?",
  "מי הכי סביר שישן 14 שעות ברצף?",
  "מי הכי סביר שיביא גיטרה למדורה וידע לנגן רק שיר אחד?",
  "מי הכי סביר שיעשה 'לייק' לתמונה מלפני 5 שנים בטעות?",
  "מי הכי סביר שיתבלבל בין תאומים?",
  "מי הכי סביר שיקנה מתנה למישהו וישמור אותה לעצמו?",
  "מי הכי סביר שיתחיל לבכות מפרסומת מרגשת בטלוויזיה?",
  "מי הכי סביר שינסה ללטף כלב עצבני ברחוב?",
  "מי הכי סביר שיזמין פיצה ב-3 לפנות בוקר?",
  "מי הכי סביר שיאבד את חפציו האישיים בתוך התיק של עצמו?",
  "מי הכי סביר שיצא מהבית עם שני גרביים בצבעים שונים?",
  "מי הכי סביר שינסה להרשים מישהו בערבית מדוברת ויגיד שטות?",
  "מי הכי סביר שישכח לסגור את הברז מים?",
  "מי הכי סביר שיבלה ארבע שעות ביוטיוב בלי לשים לב לזמן?",
  "מי הכי סביר שיאחר לפגישה החשובה בחייו?",
  "מי הכי סביר שישאל 'מה?' 3 פעמים ואז פשוט ינהן ויחייך?",
  "מי הכי סביר שיעשה דיאטת מיצים וישבור אותה עם שווארמה?",
  "מי הכי סביר שישמור קופסאות קרטון 'כי אולי נצטרך את זה פעם'?",
  "מי הכי סביר שיחפש את השלט כשהוא יושב עליו?",
  "מי הכי סביר שיחשוב שהוא יודע לנווט ויביא את כולם למבוי סתום?",
  "מי הכי סביר שינצח בתחרות אכילת נקניקיות?",
  "מי הכי סביר שיצא למרפסת וינעל את עצמו בחוץ?",
  "מי הכי סביר שישלח אימוג'י בוכה מצחוק בסיטואציה רצינית?",
  "מי הכי סביר שימליץ על סדרה ואף אחד לא יצליח לסיים את הפרק הראשון?",
  "מי הכי סביר שיעשה סלפי עם אדם מפורסם בלי לדעת מי זה?",
  "מי הכי סביר שיביא צידנית עם ארטיקים לכל מקום?",
  "מי הכי סביר שידבר עם שירות הלקוחות שעה רק כדי לקבל 5 שקלים החזר?",
  "מי הכי סביר שייקח תיק גב ענקי לטיול של שעה?",
  "מי הכי סביר שישכח את הקוד הסודי של הכספת/הטלפון?",
  "מי הכי סביר שיעשה לייק לעצמו?",
  "מי הכי סביר שיפול מהכיסא תוך כדי ישיבה רגילה?",
  "מי הכי סביר שיתחיל לאסוף משהו מוזר כמו פקקים או בולים?",
  "מי הכי סביר שיבזבז שעה בבחירת סרט בנטפליקס ואז ילך לישון?",
  "מי הכי סביר שיזמין קפה מתוסבך בטירוף בארומה?",
  "מי הכי סביר שיחשוב שהשיר ברדיו נכתב עליו?",
  "מי הכי סביר שישכח ששם משהו במיקרוגל ויגלה אותו יום למחרת?",
  "מי הכי סביר שיכנס לחדר כושר רק כדי להצטלם?",
  "מי הכי סביר שיפתח את העסק העצמאי הכי מצליח?",
  "מי הכי סביר שיריב עם ילד בן 8 במשחק מחשב?",
  "מי הכי סביר שישן עם גרביים בקיץ?",
  "מי הכי סביר שיביא מטף כיבוי אש לטיול קמפינג?",
  "מי הכי סביר שישלח 'הגעתי' עוד לפני שהוא יצא מהבית?",
  "מי הכי סביר שינסה להטיף לכולם על תזונה בריאה תוך כדי אכילת צ'יפס?",
  "מי הכי סביר שימצא כסף על הרצפה ויחפש את הבעלים?",
  "מי הכי סביר שיציע לעשות מסלול הליכה של 15 ק\"מ בשיא החום?",
  "מי הכי סביר שיעבור את מהירות המותרת בלי לשים לב?",
  "מי הכי סביר שיספר את אותו הסיפור 5 פעמים לאותם אנשים?",
  "מי הכי סביר שינסה להדליק את האור כשיש הפסקת חשמל?",
  "מי הכי סביר שיביא עוגה מאפה ידיו ויגיד שזה מקונדיטוריה?",
  "מי הכי סביר שיקנה כרטיס גירוד ויזכה ב-10 שקלים וישמח כאילו זכה במיליון?",
  "מי הכי סביר שיעשה פיקניק בסלון?",
  "מי הכי סביר שיתקשר אליך בטעות מהכיס?",
  "מי הכי סביר שיחפש חניה 40 דקות כדי לא לשלם 10 שקלים?",
  "מי הכי סביר שיסביר משהו בביטחון מלא למרות שאין לו מושג?",
  "מי הכי סביר שיביא כדורגל לכל מפגש חברתי?",
  "מי הכי סביר שינהל יומן יומיומי ולא יכתוב בו מילה?",
  "מי הכי סביר שינסה לפתוח קופסת שימורים בלי פותחן?",
  "מי הכי סביר שישכח את הכובע שלו על הבר?",
  "מי הכי סביר שישלח קישור למוצר ויגיד 'תראו איזה מציאה'?",
  "מי הכי סביר שיתקע במעלית וינצל את הזמן לשנ\"צ?",
  "מי הכי סביר שיעזוב את הארץ ויעבור לגור באירופה?",
  "מי הכי סביר שיבנה רהיט שלם ואז יגלה שנשאר לו בורג קריטי?",
  "מי הכי סביר שיחשוב שדגים מתקררים כשקר בחוץ?",
  "מי הכי סביר שיאבד את חפציו בתוך המקרר?",
  "מי הכי סביר שיגיד 'אמרתי לכם' גם כשזה לא נכון?",
  "מי הכי סביר שיעשה קניות ברשת בשעה 4 לפנות בוקר?",
  "מי הכי סביר שיביא פנס לטיול יום?",
  "מי הכי סביר שינסה לדבר במבטא אמריקאי וישמע מצחיק?",
  "מי הכי סביר שישים שעון מעורר ל-5 בבוקר וינמנם עד 8?",
  "מי הכי סביר שיסרב לאכול משהו רק כי הצורה שלו מוזרה?",
  "מי הכי סביר שיחשוב שהבראק אובמה עדיין נשיא?",
  "מי הכי סביר שיקנה ציוד ספורט יקר וישתמש בו פעם אחת?",
  "מי הכי סביר שיצלם תמונה של האוכל לפני שהוא אוכל?",
  "מי הכי סביר שישכח איפה הוא שם את המטריה בגשם?",
  "מי הכי סביר שיקפוץ למים הקרים ראשון?",
  "מי הכי סביר שיעשה פדיחה מול הבוס?",
  "מי הכי סביר שיציע משחק קופסה באמצע מסיבה?",
  "מי הכי סביר שישכח ללחוץ על 'הקלט' בשיחה חשובה?",
  "מי הכי סביר שיעבור לטבעונות ואחרי שבוע יחזור לבשר?",
  "מי הכי סביר שישים שריון סלולרי עבה במיוחד מרוב שהוא מפחד שישבר?",
  "מי הכי סביר שימצא טעות כתיב בשלט ברחוב ויעיר על זה?",
  "מי הכי סביר שיתבלבל בין דלק לסולר?",
  "מי הכי סביר שישב עם מעיל בתוך הבית?",
  "מי הכי סביר שיביא משחק מחשב לטיול?",
  "מי הכי סביר שינהג בזהירות מופרזת של 40 קמ\"ש בכביש מהיר?",
  "מי הכי סביר שיזמין קינוח נוסף רק כי התיאור נשמע יפה?",
  "מי הכי סביר שיגלה שהיה לו חור במכנסיים כל היום?",
  "מי הכי סביר שיציע רעיון מטורף וכולם יזרמו איתו?",
  "מי הכי סביר שישכח להוציא את המפתח מהמנעול בחוץ?",
  "מי הכי סביר שיגיב 'מזל טוב' על פוסט מלפני שנתיים?",
  "מי הכי סביר שישיר את המילים הלא נכונות של השיר בביטחון מלא?",
  "מי הכי סביר שיקנה מתנה לעצמו ביום ההולדת של מישהו אחר?",
  "מי הכי סביר שיחליק על קליפת בננה במציאות?",
  "מי הכי סביר שיתקשר לשאול 'איפה אתם?' כשהוא עומד מולכם?",
  "מי הכי סביר שיריב עם טלוויזיה בזמן משחק ספורט?",
  "מי הכי סביר שישכח איפה הוא חנה בתוך חניון תת-קרקעי?",
  "מי הכי סביר שיארגן מסיבת הפתעה לעצמו?",
  "מי הכי סביר שיביא נשנושים לכל מקום למקרה של 'חירום'?",
  "מי הכי סביר שיחשוב שלווייתן הוא דג?",
  "מי הכי סביר שישכח לשים דאודורנט לפני יציאה?",
  "מי הכי סביר שיכנס לחדר הלא נכון וישב שם 5 דקות עד שישים לב?",
  "מי הכי סביר שינסה להסביר חוק בפיזיקה בלי להבין בזה כלום?",
  "מי הכי סביר שישבור שן מגרעין של זית?",
  "מי הכי סביר שישתף פוסט פייק ניוז?",
  "מי הכי סביר שיספר סוד חמש דקות אחרי שהבטיח לשמור אותו?",
  "מי הכי סביר שיביא משקפת לטיול בנחל?",
  "מי הכי סביר שיזמין משהו באינטרנט וישכח מזה עד שזה מגיע?",
  "עם מי הכי כיף ללכת להופעה?",
  "מי יביא לטיול את התרופה שאף אחד לא חשב לקחת?",
  "מי הכי סביר שיזמין את המנה הכי יקרה בתפריט בלי להסתכל על המחיר?",
  "מי יבזבז 20 דקות על בחירת פילטר לתמונה?",
  "מי יגיד 'אני תוך 5 דקות שם' כשהוא עוד במיטה?",
  "מי הכי סביר שיצא מהסופר עם עודף של 100 שקל ויחזור להחזיר אותו?",
  "מי ינסה לשכנע את כולם שקפה בלי סוכר זה בעצם טעים?",
  "עם מי הכי מצחיק להיתקע בפקק של שעתיים?",
  "מי יתחיל ללמוד נגינה על כלי נגינה מוזר ויפסיק אחרי שבוע?",
  "מי יאבד את המשקפיים שלו כשהם על המצח שלו?",
  "מי ינסה לתקן את האינטרנט בבית וינתק את החשמל לכל הבניין?",
  "מי הכי סביר שיארגן את כל הלו\"ז של הטיול לחו\"ל ברמת הדקות?",
  "מי יכנס לחנות רק 'להסתכל' ויצא עם 4 שקיות מלאות?",
  "מי יחפש בגוגל 'למה יש לי כאב בבוהן' וישתכנע שנשארו לו יומיים לחיות?",
  "מי הכי סביר שישכח איפה הוא שם את המפתחות כשהם כבר ביד שלו?",
  "מי יציע ללכת ברגל 'כי זה קרוב' וזה אורך שעה וחצי?",
  "מי יאכל את הפיצה מהקצה של הקרסט קודם?",
  "מי יתקשר אליך בשיחת וידאו בלי להזהיר מראש?",
  "מי הכי סביר שיאבד את כרטיס האשראי וימצא אותו בכיס של המכנסיים הישנים?",
  "מי יביא קופסת עוגיות לעבודה ויאכל את כולן לבד?",
  "מי יארז במזוודה ציוד לכל תרחיש אפשרי בעולם?",
  "מי הכי סביר שישכח לשים מלח באוכל שהוא בישל לחברים?",
  "מי ינסה לשכנע את המאבטח בקניון לפתוח לו אחרי שעות הפעילות?",
  "מי יזמין קינוח ענקי ויגיד 'אני רק רק אות ביס אחד'?",
  "מי יתחיל להתאמן למרתון ויפסיק אחרי 200 מטר?",
  "מי הכי סביר שישכח את הסיסמה לווייפיי של הבית שלו?",
  "מי יקנה תמונה לבית וישאיר אותה רכונה על הקיר שנה בלי לתלות?",
  "מי יריב עם השירות לקוחות בטלפון ואז יגיד 'תודה רבה, יום מקסים'?",
  "מי ינסה ללמד את כולם איך לשחק משחק שהוא בעצמו לא מכיר?",
  "מי הכי סביר שישכח את המטריה באוטובוס ביום הגשום בשנה?",
  "מי יכנס לחנות ספרים ויצא רק אחרי 3 שעות?",
  "מי יאכל גלידה באמצע החורף מתחת לשמיכה?",
  "מי ינסה לפתוח בקבוק שתייה עם השיניים?",
  "מי הכי סביר שישכח לסגור את חלון האוטו כשיש גשם בחוץ?",
  "מי יקנה מתנה לחבר ויפתח אותה בעצמו 'רק לראות שזה עובד'?",
  "מי ירד להוריד את הזבל ויחזור אחרי שעה כי פגש שכן?",
  "מי ינסה לשכנע את כולם שחתולים מבינים עברית?",
  "מי הכי סביר שיגלה שהטלפון שלו היה על מצב רטט במשך יומיים?",
  "מי ינסה להכין סושי בבית ויצור בלגן בכל המטבח?",
  "מי יביא מטען נייד אבל ישכח להטעין אותו מראש?",
  "מי הכי סביר שישאיר את האור בחדר דלוק כשהוא יוצא מהבית?",
  "מי יציע ללכת ללונה פארק ויפחד לעלות על כל המתקנים?",
  "מי יתקשר לשאול מה המיקוד של הבית של עצמו?",
  "מי ירדם על הספה בסלון ויגיד 'אני רק עצמתי עיניים לשנייה'?",
  "מי הכי סביר שיעשה קניות בסופר כשהוא רעב ויקנה חצי חנות?",
  "מי יקנה נעליים לוחצות כי 'הן היו ב-70% הנחה'?",
  "מי ינצח במשחק 'ברוב קולות' היום?"
];

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const rooms = new Map();

function createRoom(roomId, hostSocketId) {
  const shuffledText = shuffleArray(rawQuestions);
  const room = {
    id: roomId,
    hostSocketId: hostSocketId,
    players: new Map(),
    pendingPlayers: new Map(),
    nextPlayerNumber: 1,
    activeQuestions: shuffledText.map((qText, index) => ({
      id: index + 1,
      type: "PLAYER_SELECT",
      text: qText
    })),
    currentQuestionIndex: 0,
    questionsPlayed: 0,
    currentQuestion: null,   // השאלה הפעילה כרגע
    roundActive: false       // האם מקבלים הצבעות כרגע
  };
  rooms.set(roomId, room);
  broadcastRoomList();
  return room;
}

function getPublicRoomsList() {
  const list = [];
  rooms.forEach((room, id) => {
    list.push({ id, count: room.players.size });
  });
  return list;
}

function broadcastRoomList() {
  io.emit('rooms_list_update', getPublicRoomsList());
}

function getPlayersList(room) {
  if (!room) return [];
  return Array.from(room.players.values())
    .map(p => ({
      id: p.id,
      number: p.number,
      name: p.name,
      score: p.score,
      hasVoted: p.currentVote !== null,
      isHost: p.id === room.hostSocketId,
      connected: p.connected !== false
    }))
    .sort((a, b) => b.score - a.score);
}

// חיבור מחדש: מצמידים את הסוקט החדש לשחקן הקיים (שומר ניקוד, שומר תפקיד מנהל)
function rebindPlayer(room, player, socket) {
  const oldId = player.id;
  if (player.removalTimer) {
    clearTimeout(player.removalTimer);
    player.removalTimer = null;
  }
  room.players.delete(oldId);
  player.id = socket.id;
  player.connected = true;
  room.players.set(socket.id, player);
  if (room.hostSocketId === oldId) {
    room.hostSocketId = socket.id;
  }
  socket.join(room.id);
  socket.roomId = room.id;
  socket.playerName = player.name;
}

// כל המידע שהלקוח צריך כדי לשחזר את המסך אחרי חיבור מחדש
function buildResumePayload(room, player) {
  return {
    roomId: room.id,
    isHost: room.hostSocketId === player.id,
    roundActive: room.roundActive,
    question: room.currentQuestion,
    qIndex: room.questionsPlayed,
    total: MAX_QUESTIONS,
    myVote: player.currentVote,
    players: getPlayersList(room)
  };
}

function resumePlayer(room, player, socket) {
  rebindPlayer(room, player, socket);
  socket.emit('rejoin_success', buildResumePayload(room, player));
  io.to(room.id).emit('update_players', getPlayersList(room));
  if (room.hostSocketId === socket.id) {
    socket.emit('pending_players_update', getPendingList(room));
  }
  broadcastRoomList();
}

// הסרה סופית של שחקן שלא חזר בתוך חלון החסד
function finalizeRemoval(room, player) {
  if (!rooms.has(room.id)) return;
  if (player.connected) return; // הספיק לחזור בינתיים
  if (!room.players.has(player.id)) return;

  room.players.delete(player.id);

  if (room.players.size === 0) {
    rooms.delete(room.id);
    broadcastRoomList();
    return;
  }

  if (player.id === room.hostSocketId) {
    const remaining = Array.from(room.players.values());
    const newHost = remaining.find(p => p.connected) || remaining[0];
    room.hostSocketId = newHost.id;
    io.to(room.hostSocketId).emit('host_status', true);
    io.to(room.hostSocketId).emit('pending_players_update', getPendingList(room));
  }

  io.to(room.id).emit('update_players', getPlayersList(room));
  broadcastRoomList();
  checkRoundCompletion(room);
}

function getPendingList(room) {
  if (!room) return [];
  return Array.from(room.pendingPlayers.values()).map(p => ({
    id: p.id,
    name: p.name
  }));
}

io.on('connection', (socket) => {
  // שליחת רשימת חדרים מיידית בחיבור ראשוני
  socket.emit('rooms_list_update', getPublicRoomsList());

  // בקשה יזומה של הלקוח לקבלת החדרים
  socket.on('get_rooms', () => {
    socket.emit('rooms_list_update', getPublicRoomsList());
  });

  socket.on('create_room', ({ roomId, hostName }) => {
    const cleanRoomId = (roomId || '').trim();
    const cleanHostName = (hostName || '').trim();
    if (!cleanRoomId) {
      socket.emit('room_error', 'נא להזין שם חדר תקין.');
      return;
    }
    if (!cleanHostName) {
      socket.emit('room_error', 'נא להזין שם תקין.');
      return;
    }
    if (rooms.has(cleanRoomId)) {
      socket.emit('room_error', 'שם החדר כבר קיים, אנא בחר שם אחר.');
      return;
    }

    const room = createRoom(cleanRoomId, socket.id);
    socket.join(cleanRoomId);
    socket.roomId = cleanRoomId;

    const hostPlayer = {
      id: socket.id,
      number: room.nextPlayerNumber++,
      name: cleanHostName,
      score: 0,
      currentVote: null,
      connected: true,
      removalTimer: null
    };

    room.players.set(socket.id, hostPlayer);

    socket.emit('room_created', { roomId: cleanRoomId, isHost: true });
    io.to(cleanRoomId).emit('update_players', getPlayersList(room));
    broadcastRoomList();
  });

  socket.on('join_room_request', ({ roomId, playerName }) => {
    const cleanRoomId = roomId.trim();
    const room = rooms.get(cleanRoomId);

    if (!room) {
      socket.emit('room_error', 'החדר המבוקש אינו קיים.');
      return;
    }

    const cleanName = (playerName || '').trim();
    if (!cleanName) {
      socket.emit('room_error', 'נא להזין שם תקין.');
      return;
    }

    // אם שחקן עם השם הזה קיים אבל מנותק - זה חיבור מחדש (רענון דף / נפילת רשת)
    const existing = Array.from(room.players.values()).find(p => p.name === cleanName);
    if (existing) {
      const stillAlive = existing.connected && io.sockets.sockets.get(existing.id);
      if (stillAlive) {
        socket.emit('room_error', `השם "${cleanName}" כבר תפוס בחדר הזה, בחר שם אחר.`);
        return;
      }
      // חוזר למשחק בלי צורך באישור מחדש - שומר את הניקוד שלו
      resumePlayer(room, existing, socket);
      return;
    }

    const namePending = Array.from(room.pendingPlayers.values()).some(p => p.name === cleanName);
    if (namePending) {
      socket.emit('room_error', `השם "${cleanName}" כבר תפוס בחדר הזה, בחר שם אחר.`);
      return;
    }

    socket.roomId = cleanRoomId;
    socket.playerName = cleanName;

    room.pendingPlayers.set(socket.id, { id: socket.id, name: cleanName });

    socket.emit('waiting_for_approval');
    io.to(room.hostSocketId).emit('pending_players_update', getPendingList(room));
  });

  // חיבור מחדש אוטומטי - הלקוח שולח את זה בעצמו כשהסוקט מתחבר מחדש
  socket.on('rejoin_room', ({ roomId, playerName }) => {
    const room = rooms.get((roomId || '').trim());
    const cleanName = (playerName || '').trim();

    if (!room || !cleanName) {
      socket.emit('rejoin_failed');
      return;
    }

    const existing = Array.from(room.players.values()).find(p => p.name === cleanName);
    if (!existing) {
      socket.emit('rejoin_failed');
      return;
    }

    // אם השחקן הזה כבר מחובר מסוקט אחר חי - לא נותנים להשתלט
    const stillAlive = existing.connected && existing.id !== socket.id && io.sockets.sockets.get(existing.id);
    if (stillAlive) {
      socket.emit('rejoin_failed');
      return;
    }

    resumePlayer(room, existing, socket);
  });

  socket.on('approve_player', (applicantSocketId) => {
    const room = rooms.get(socket.roomId);
    if (!room || socket.id !== room.hostSocketId) return;

    const pendingPlayer = room.pendingPlayers.get(applicantSocketId);
    if (pendingPlayer) {
      room.pendingPlayers.delete(applicantSocketId);

      const approvedPlayer = {
        id: applicantSocketId,
        number: room.nextPlayerNumber++,
        name: pendingPlayer.name,
        score: 0,
        currentVote: null,
        connected: true,
        removalTimer: null
      };

      const targetSocket = io.sockets.sockets.get(applicantSocketId);

      // אם המבקש התנתק בינתיים - לא מוסיפים "שחקן רפאים" שיתקע את המשחק
      if (!targetSocket) {
        io.to(room.hostSocketId).emit('pending_players_update', getPendingList(room));
        return;
      }

      room.players.set(applicantSocketId, approvedPlayer);
      targetSocket.join(room.id);
      targetSocket.emit('join_approved', { roomId: room.id, isHost: false });

      // אם מצטרפים באמצע שאלה - שולחים למצטרף את השאלה הנוכחית כדי שלא יתקע במסך ריק
      if (room.roundActive && room.currentQuestion) {
        targetSocket.emit('new_question', {
          question: room.currentQuestion,
          qIndex: room.questionsPlayed,
          total: MAX_QUESTIONS,
          players: getPlayersList(room)
        });
      }

      io.to(room.id).emit('update_players', getPlayersList(room));
      io.to(room.hostSocketId).emit('pending_players_update', getPendingList(room));
      broadcastRoomList();
    }
  });

  socket.on('reject_player', (applicantSocketId) => {
    const room = rooms.get(socket.roomId);
    if (!room || socket.id !== room.hostSocketId) return;

    if (room.pendingPlayers.has(applicantSocketId)) {
      room.pendingPlayers.delete(applicantSocketId);

      const targetSocket = io.sockets.sockets.get(applicantSocketId);
      if (targetSocket) {
        targetSocket.emit('join_rejected', 'בקשת ההצטרפות נדחתה על ידי מנהל החדר.');
      }

      io.to(room.hostSocketId).emit('pending_players_update', getPendingList(room));
    }
  });

  socket.on('next_question', (data) => {
    const reqRoomId = (data && data.roomId) ? data.roomId : socket.roomId;
    const room = rooms.get(reqRoomId);

    if (!room || socket.id !== room.hostSocketId) return;

    socket.roomId = reqRoomId;
    room.players.forEach(p => p.currentVote = null);

    if (room.currentQuestionIndex >= room.activeQuestions.length) {
      const shuffledText = shuffleArray(rawQuestions);
      room.activeQuestions = shuffledText.map((qText, index) => ({
        id: index + 1,
        type: "PLAYER_SELECT",
        text: qText
      }));
      room.currentQuestionIndex = 0;
    }

    const q = room.activeQuestions[room.currentQuestionIndex];
    room.questionsPlayed++;
    room.currentQuestionIndex++;
    room.currentQuestion = q;
    room.roundActive = true;

    io.to(room.id).emit('new_question', {
      question: q,
      qIndex: room.questionsPlayed,
      total: MAX_QUESTIONS,
      players: getPlayersList(room)
    });

    io.to(room.id).emit('update_players', getPlayersList(room));
  });

  socket.on('submit_vote', (vote) => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    // לא מקבלים הצבעות כשאין שאלה פעילה (לובי / מסך תוצאות)
    if (!room.roundActive) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    // מצביעים רק על שחקן שקיים בחדר
    const candidateExists = Array.from(room.players.values()).some(p => p.name === vote);
    if (!candidateExists) return;

    player.currentVote = vote;

    const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected);
    const votedCount = connectedPlayers.filter(p => p.currentVote !== null).length;

    io.to(room.id).emit('update_players', getPlayersList(room));
    io.to(room.id).emit('vote_progress', { votedCount, total: connectedPlayers.length });

    checkRoundCompletion(room);
  });

  socket.on('restart_game', (data) => {
    const reqRoomId = (data && data.roomId) ? data.roomId : socket.roomId;
    const room = rooms.get(reqRoomId);

    if (!room || socket.id !== room.hostSocketId) return;

    socket.roomId = reqRoomId;

    room.players.forEach(p => {
      p.score = 0;
      p.currentVote = null;
    });

    const shuffledText = shuffleArray(rawQuestions);
    room.activeQuestions = shuffledText.map((qText, index) => ({
      id: index + 1,
      type: "PLAYER_SELECT",
      text: qText
    }));
    room.currentQuestionIndex = 0;
    room.questionsPlayed = 0;

    const q = room.activeQuestions[room.currentQuestionIndex];
    room.questionsPlayed++;
    room.currentQuestionIndex++;
    room.currentQuestion = q;
    room.roundActive = true;

    io.to(room.id).emit('new_question', {
      question: q,
      qIndex: room.questionsPlayed,
      total: MAX_QUESTIONS,
      players: getPlayersList(room)
    });

    io.to(room.id).emit('update_players', getPlayersList(room));
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.roomId);
    if (!room) return;

    if (room.pendingPlayers.has(socket.id)) {
      room.pendingPlayers.delete(socket.id);
      io.to(room.hostSocketId).emit('pending_players_update', getPendingList(room));
    }

    const player = room.players.get(socket.id);
    if (!player) return;

    // לא מוחקים מיד! טלפון שננעל או רשת שנפלה לרגע גורמים לניתוק זמני.
    // מסמנים כמנותק ונותנים חלון חסד לחזור - אם לא חזר, מסירים סופית.
    player.connected = false;
    if (player.removalTimer) clearTimeout(player.removalTimer);
    player.removalTimer = setTimeout(() => finalizeRemoval(room, player), DISCONNECT_GRACE_MS);

    io.to(room.id).emit('update_players', getPlayersList(room));

    // אם כל שאר המחוברים כבר הצביעו - הסיבוב מסתיים ולא נתקע בגללו
    checkRoundCompletion(room);
  });
});

function checkRoundCompletion(room) {
  if (!room || !room.roundActive) return;
  const connectedPlayers = Array.from(room.players.values()).filter(p => p.connected);
  if (connectedPlayers.length === 0) return;
  const allVoted = connectedPlayers.every(p => p.currentVote !== null);
  if (allVoted) {
    calculateResults(room);
  }
}

function calculateResults(room) {
  room.roundActive = false;
  room.currentQuestion = null;

  const votes = {};

  room.players.forEach(p => { votes[p.name] = 0; });
  room.players.forEach(p => {
    if (p.currentVote) {
      votes[p.currentVote] = (votes[p.currentVote] || 0) + 1;
    }
  });

  let maxVotes = 0;
  for (const count of Object.values(votes)) {
    if (count > maxVotes) maxVotes = count;
  }

  const topVotedPlayers = [];
  if (maxVotes > 0) {
    for (const [candidate, count] of Object.entries(votes)) {
      if (count === maxVotes) topVotedPlayers.push(candidate);
    }
  }

  const isTie = topVotedPlayers.length !== 1;
  const winnerName = isTie ? null : topVotedPlayers[0];

  room.players.forEach(p => {
    const votedForSelf = (p.currentVote === p.name);

    if (!isTie) {
      if (p.currentVote === winnerName) {
        p.score += votedForSelf ? 2 : 1;
      } else if (votedForSelf) {
        p.score = Math.max(0, p.score - 1);
      }
    } else {
      if (votedForSelf && !topVotedPlayers.includes(p.name)) {
        p.score = Math.max(0, p.score - 1);
      }
    }
  });

  const playersList = getPlayersList(room);
  const topPlayer = playersList[0];

  const isGameOver = (topPlayer && topPlayer.score >= TARGET_SCORE) || room.questionsPlayed >= MAX_QUESTIONS;

  if (isGameOver) {
    io.to(room.id).emit('game_over', {
      winner: topPlayer,
      playersList: playersList
    });
  } else {
    io.to(room.id).emit('show_results', {
      winningVote: winnerName,
      isTie: isTie,
      votesCount: votes,
      playersList: playersList
    });
  }

  io.to(room.id).emit('update_players', playersList);
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
