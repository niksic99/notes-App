# notes-App — Expo + Supabase

Projekt je pripremljen prema priloženim dokumentima *Tutorial_biljeske_Expo_Supabase_HR* i *Supabase_biljeske_SQL_objasnjenje*.

## Što aplikacija radi
- Pri prvom otvaranju izrađuje anonimnu Supabase sesiju.
- Pri sljedećim otvaranjima ponovno koristi spremljenu sesiju.
- Učitava bilješke korisnika iz tablice `notes`.
- Sprema novu bilješku klikom na gumb.
- RLS pravilom ograničava pristup na bilješke trenutačnog korisnika.

Ova verzija dodaje i čita bilješke. Nema uređivanja ni brisanja.

## 1. Preduvjeti
Instaliraj Node.js LTS, Git i Visual Studio Code.

## 2. Napravi Expo projekt prema službenom vodiču
U VS Code terminalu pokreni:

```bash
npx create-expo-app@latest notes-App
cd notes-App
```

Ako CLI ponudi izbor SDK-a, odaberi Latest. Ovaj ZIP sadrži datoteke aplikacije. Ako si projekt upravo generirao u istoj mapi, kopiraj sadržaj ZIP-a preko projekta i dopusti zamjenu datoteka. Zadrži `package.json` koji je generirao Expo ako želiš zadržati točno usklađene verzije paketa; zatim instaliraj pakete iz sljedećeg koraka.

## 3. Instaliraj pakete
U mapi projekta pokreni:

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

Ako si koristio `package.json` iz ovog ZIP-a, pokreni `npm install`, a zatim:

```bash
npx expo install --fix
```

## 4. Supabase baza
1. Otvori https://supabase.com/dashboard i izradi novi projekt.
2. Otvori SQL Editor → New query.
3. Kopiraj sadržaj `supabase/notes.sql` i klikni Run.
4. Očekivani rezultat: `Success. No rows returned`.
5. Otvori Authentication → Sign In / Providers → Anonymous.
6. Uključi **Allow anonymous sign-ins** i spremi promjenu.

SQL pokreni samo jednom. Ako tablica `notes` već postoji, nemoj ponovno izvršavati `create table`.

## 5. Poveži aplikaciju
U Supabaseu klikni Connect → Framework (ili Settings → API Keys). Kopiraj:
- Project URL
- Publishable key

U glavnoj mapi projekta izradi datoteku `.env` (uz `package.json`) i upiši:

```env
EXPO_PUBLIC_SUPABASE_URL=https://TVOJ-PROJEKT.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_TVOJ_KLJUC
```

Zamijeni primjere svojim vrijednostima. Koristi samo javni Publishable key, nikada `service_role` ili secret key. Nemoj slati `.env` na GitHub. `.gitignore` već isključuje `.env`.

## 6. Pokreni aplikaciju
```bash
npx expo start --web --clear
```

Aplikacija bi se trebala otvoriti u pregledniku. Ako se ne otvori, pritisni `w` u terminalu Expo poslužitelja.

## 7. Testiraj
1. Pričekaj da se učitavanje završi.
2. Upiši `Moja prva bilješka`.
3. Klikni **Spremi bilješku**.
4. Provjeri da se pojavila pod **Spremljene bilješke**.
5. Osvježi stranicu. Bilješka se treba ponovno prikazati.
6. U Supabaseu otvori Table Editor → notes i provjeri spremljeni redak.

Koristi isti preglednik, profil i adresu kako bi se ponovno koristila ista anonimna sesija. Brisanje podataka preglednika ili privatni prozor može stvoriti novi anonimni identitet.

## 8. GitHub predaja
U GitHubu izradi novi prazan repository, npr. `notes-App`. Nemoj dodavati README, .gitignore ili licencu jer ih projekt već ima.

U terminalu, iz glavne mape projekta:

```bash
git init
git add .
git status
git commit -m "Izrada Expo aplikacije za biljeske"
git branch -M main
git remote add origin https://github.com/TV-USERNAME/notes-App.git
git push -u origin main
```

U naredbi `git remote add` zamijeni URL točnim URL-om svog GitHub repozitorija (bez razmaka). Prije `git add .` provjeri da `.env` nije na popisu datoteka za slanje. Ako je, stani i provjeri `.gitignore`.

## Struktura
- `src/app/index.tsx` — sučelje i logika bilješki
- `src/app/_layout.tsx` — Expo Router raspored
- `lib/supabase.ts` — Supabase klijent i trajanje sesije
- `supabase/notes.sql` — tablica i RLS pravilo
- `.env.example` — primjer varijabli (bez stvarnih tajni)

## Napomena o sigurnosti
Publishable key je namijenjen klijentskoj aplikaciji. Sigurnost podataka osiguravaju anonimna korisnička sesija i RLS pravilo. Nikada nemoj u aplikaciju ili GitHub stavljati Supabase secret ili service_role ključ.
