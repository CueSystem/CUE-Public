# Poznatky o formátu CVC projektu

Rozbor 2026-11-07. Referenční soubor:
`C:\Users\Jaroslav Dibitanzl\Desktop\AI for CVC\HouseNechanice.cvcp`.
Původní soubor nebyl změněn. Další vzorky: TestAI.cvcp a export vlastního RelayDriver.cvcd.
Jde o experimentálně zjištěný formát, nikoli specifikaci výrobce.

Další zdroj komponent: instalovaná knihovna `Data`, popsaná v **DATA-LIBRARY.md**.
Obecný parser byl navíc ověřen bajtově shodným roundtripem na všech 17 jejích
projektech (16 s verzí serializace 21, jeden s verzí 22).

## Ověřená binární vrstva

| Pozice / tag | Formát |
| --- | --- |
| 0–3 | CRC32 všech bajtů od pozice 4, uint32 little-endian |
| 4–11 | Signatura `08 9c 58 ca db b1 26 95` |
| 12–13 | Hodnota 22, uint16 little-endian; pravděpodobně verze serializace, nikoli verze CVC |
| F0 | Začátek vnořené skupiny |
| F1 | Konec skupiny |
| 01 | Čtyřbajtová celočíselná hodnota little-endian; znaménko závisí na významu pole |
| 03 | uint32 délka v bajtech + UTF-16LE text bez terminátoru |
| 04 | uint32 délka v bajtech + obecný obsah; někdy UTF-16LE, jindy binární data |
| 05, 06 | uint32 délka obsahu; prázdný obsah nebo uint32 nekomprimovaná délka + zlib stream |

Délka u 05/06 zahrnuje čtyři bajty nekomprimované délky. Oba tagy nesou
komprimovaná data; 06 není výhradně konfigurace. Ve vzorku nese také PDF a
textovou přílohu v jiném kódování než UTF-16. Nesmí se automaticky převádět na text.
F0/F1 uvnitř payloadu nejsou oddělovače, parser musí respektovat délky.

Parser prošel celý soubor o 18 588 666 bajtech bez neznámého tagu.
Zpětná serializace stromu je **bajtově totožná** s originálem včetně CRC.
To potvrzuje rámování a zachování dat, ne úplné porozumění jejich významu.

## Hlavní strom

Jediná kořenová skupina obsahuje v tomto pořadí:

1. Skupinu definic zdrojů: **79** položek.
2. Skupinu instancí CUE jednotek: **6** položek.
3. Skupinu instancí zařízení: **136** položek.
4. Komprimovanou konfiguraci projektu s tagem 06.

Celkem 10 258 skupin; 5 684 celočíselných polí, 2 978 polí 03,
5 385 polí 04, 529 polí 05 a 3 pole 06. Z 283 neprázdných komprimovaných polí
se všechna podařilo rozbalit s odpovídající délkou. Heuristika rozpoznala
281 UTF-16 textů; zbývající dva payloady jsou PDF a jinak kódovaný text.

## Definice zdroje

Všech 79 zdrojů má deset přímých polí:

| Index | Obsah |
| --- | --- |
| 0 | 03: jméno zdroje |
| 1 | 01: kód typu |
| 2 | 01: identifikátor zdroje |
| 3 | 03: metadata ve formátu `KLÍČ:=hodnota`, oddělená CRLF |
| 4 | 03: původní jméno importovaného souboru, případně prázdné |
| 5 | 05: volitelná komprimovaná data; přesný význam neuzavřen |
| 6 | 05: další volitelná komprimovaná data; význam neuzavřen |
| 7 | 05: XPL2 zdrojový kód, UTF-16LE po dekompresi |
| 8 | F0: vnořené zdroje/objekty včetně textů a grafiky |
| 9 | F0: další vnořené položky, mimo jiné přiložené dokumenty |

Pozorované typy: 2 = MyCommon (1), 3 = device drivery (44),
4 = definice CUE jednotek (5), 5 = kolekce grafických objektů (26),
7 = další kategorie (3; význam zatím neurčen). Čísla v závorkách jsou počty.
Význam typů je odvozen z názvů a obsahu, nikoli z oficiálního enumu.

## Instance a konfigurace

Instance zařízení má čtyři pole: jméno instance (03), jméno nadřazené
CUE jednotky (03), jméno definice driveru (03), komprimovaný text nastavení (05).
Text obsahuje mimo jiné `MyConnectors` a `MyProperties`, složené závorky
a přiřazení `:=`. Propojování konektorů nelze nahradit pouhým přidáním definice driveru.

Instance CUE jednotky má ve vzorku 13 polí: jméno, čtyři číselná pole,
jméno definice jednotky, komprimovaná data, skupina, tři číselná pole,
další skupina a payload 04. Číselné pole na indexu 2 odpovídá zabalené IPv4
adrese; význam ostatních polí vyžaduje další porovnávací vzorky.

Konfigurace je UTF-16LE text s oddíly:
`#VERSION 4`, `#PAGES`, `#CONTROLLERS`, `#DEVICES`,
`#INTERNALDEBUGCONFIGURATION`, `#DEBUGCONFIGURATION`, `#MULTIIPADDRESSES`,
`#ALLSIMULATIONCONFIGURATION`, `#MDIWINDOWS`, `#END`.
Obsahuje pohledy editoru a další vazby; při úpravách zachovat neznámé řádky.

## Nástroje a další práce

- `inspect-project.mjs`: obecný parser, bezeztrátový serializer, inventář a extrakce textů.
- `analysis/HouseNechanice/structure.json`: offsety, cesty ve stromu, typy a délky bloků, SHA256.
- `analysis/HouseNechanice/texts/`: lokálně extrahované texty podle offsetu původního pole.
- `project.mjs`: starší generátor pouze minimálního projektu s jedním reléovým driverem.

Pro opakování rozboru:

```powershell
node inspect-project.mjs 'C:\Users\Jaroslav Dibitanzl\Desktop\AI for CVC\HouseNechanice.cvcp' analysis/HouseNechanice
```

Při dalších úpravách nejdřív načíst tento dokument. Zachovávat neznámé payloady
jako bajty, přepočítat délky a CRC, kontrolovat jedinečnost ID a vazby podle jmen.
Původní soubor nikdy nepřepisovat při experimentu. Strukturální roundtrip není
ověření kompilace ani správnosti nových vazeb v CVC. Úplná sémantika grafických
objektů, akcí a všech vlastností zatím není zmapovaná.
