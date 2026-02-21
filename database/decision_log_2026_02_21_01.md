DECISION ID: DL-2026-02-21-01

DATE:
2026-02-21

DOMAIN:
finance

CHANGE TYPE:
schema

SUMMARY:
`finance_transactions` tablosuna `amount_try` (BIGINT) adında yeni bir sütun eklenmesi.

MOTIVATION:
Kullanıcı birden fazla döviz birimi (USD, EUR, TRY) ile işlem yapabilmektedir. Sistem kuralı gereği Dashboard üzerinde kalan döviz bakiyesinin "güncel kurdan" hesaplanması, ancak döviz ile yapılan harcamaların (gider) "işlemin yapıldığı anki kur" (tarihsel kur) üzerinden TL'ye çevrilerek gösterilmesi istenmiştir (Cash-based ve Integer Currency prensipleri). Bu nedenle, kur dalgalanmalarından etkilenmemesi için her finansal hareketin o anki TL karşılığının veritabanında tamsayı (amount_try, kuruş cinsinden) olarak saklanmasına karar verilmiştir.

ARCHITECTURAL IMPACT:
Finance service, `createTransaction` ve `updateTransaction` metodları sırasında dış bir servisten (`/api/finance/exchange-rates`) güncel kuru çekip, işleme ait `amount_try` değerini hesaplayarak veritabanına kaydedecektir. `getDashboardStats` metodu net bakiyeyi hesaplarken TRY dışındaki kurların "güncel" değerlerini, giderlerin ise "tarihsel" karşılıklarını (`amount_try`) kullanacaktır.

SCHEMA IMPACT:
New column
Table `finance_transactions`: ADD COLUMN `amount_try` BIGINT. Existing rows will be backfilled with `amount` (assuming existing are TRY).

RISK LEVEL:
High

ROLLBACK STRATEGY:
`ALTER TABLE finance_transactions DROP COLUMN amount_try;` komutu ile sütun geri alınabilir.

GUARDIAN CONFIDENCE:
98%

STATUS:
Pending
