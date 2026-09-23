# Axtarış

Azərbaycan bazarında məhsulların qiymət diapazonunu göstərən platforma. İstifadəçi məhsul və ya kateqoriya yazır, sistem son 30 gündə bazada olan qiymətlərdən minimum, median, maksimum və satıcı sayını qaytarır. Bazada olmayan məlumat göstərilmir.

## İşə salmaq

```bash
npm ci
cp .env.example .env.local   # FIREBASE_SERVICE_ACCOUNT_BASE64 dəyərini yazın
npm run dev
```

Komandalar: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Firebase

Layihə: `axtaris-b9ae7`, Firestore (`(default)`), region `europe-west1`.

Brauzer bazaya birbaşa çıxış etmir (`firestore.rules` hər şeyi bağlayır). Oxuma `/api/search` və server səhifəsi üzərindən Admin SDK ilə gedir. İndeksi bir dəfə deploy etmək lazımdır:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:indexes --project axtaris-b9ae7
```

Service account açarı yalnız Vercel və GitHub Secrets-də saxlanır, repoya yazılmır.

## Məlumat modeli

- `products/{id}`: `displayName`, `brand`, `model`, `category`, `variant` (`edt|edp|parfum|elixir|cologne|null`), `volumeMl`, `aliases[]`
- `offers/{id}`: `productId`, `priceAzn`, `oldPriceAzn`, `authenticity` (`original|replica|unknown`), `sourceType` (`online_store|marketplace|instagram|tiktok`), `sellerType` (`store|individual`), `sellerKey`, `sellerName`, `sellerUrl`, `effectiveAt`

`effectiveAt` sosial postlarda post tarixi, mağazalarda qiymətin son yoxlanma tarixidir. Süzgəc bu sahə üzrə işləyir. Köhnə qeydlər silinmir, tarixçə üçün qalır.

## Hesablama qaydaları

- Pəncərə: 7, 15, 30 və ya 90 gün, defolt 30 (`lib/config.ts`).
- Hər satıcının pəncərədəki ən yeni qiyməti sayılır, eyni satıcının təkrar elanları medianı dəyişmir.
- Orijinal, replika və təsnif olunmayan qruplar ayrıca hesablanır.
- Qrupda 3-dən az satıcı varsa median göstərilmir, yalnız tapılan qiymətlər verilir.
- Fərdi satıcının adı və linki API cavabına düşmür. Mağazanın linki yalnız `http/https` olduqda verilir.

## Hələ olmayanlar

Crawler adapterləri, Vercel region konfiqurasiyası, sorğu limiti və məhsul indeksi üçün xarici axtarış mühərriki. Səhifə hazırda `noindex`-dir.
