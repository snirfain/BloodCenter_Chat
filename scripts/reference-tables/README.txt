טבלאות ייחוס (לא נטענות באפליקציה). מקור: קבצי TSV/סקריפטים בתיקיית scripts/.
רשימת התרופות — ייחוס רשמי מדף מד״א:
  https://www.mdais.org/blood-donation/information-drug-blood
  (מראה מקומי: scripts/medication_eligibility.tsv)

להפקה מחדש:
  python3 scripts/build-receiving-criteria-table.py
  python3 scripts/build-medication-eligibility.py
  python3 scripts/build-country-travel-reference.py

קבצים:
  receiving_blood_criteria.json
  medication_eligibility_flat.json
  country_travel_reference.json

