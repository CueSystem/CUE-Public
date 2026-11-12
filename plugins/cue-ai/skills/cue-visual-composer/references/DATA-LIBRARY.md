# Instalovaná knihovna CVC

Zdroj: `C:\Program Files\CUE\CUE Visual Composer\Data`.
Prozkoumáno 2026-11-07, pouze čtením. Soubory v instalaci nebyly upraveny.

Strojový katalog: `analysis/data-catalog.json`.
Obsahuje relativní cesty, velikosti, přípony, hlavičky, kontrolu CRC u
zkoumaných CVC kontejnerů a dostupná metadata (PRODUCTNAME, MANUFACTURER,
PRODUCTTYPE, CT a další původní klíče). Metadata jsou vyhledána jako kandidáti
v hlavičce; jejich nalezení samo o sobě neznamená rozbor celého kontejneru.

| Složka | Obsah |
| --- | --- |
| CUEunits | 95 definic `.cvcc` |
| Fix | 2 další `.cvcc`; jejich účel před použitím ověřit |
| CUEdevices | 91 `.cvcd` a 9 `.cvcds` |
| Devices | 110 `.cvcd`, 7 `.cvcds`, 1 PDF |
| Collections | 59 `.cvcg`, 14 `.cvcgs` |
| Applets | 8 `.cvcl` |
| Modules | 1 `.cvcm` |
| Plugins | 17 skutečných projektových souborů `.cvcp` |
| Firmwares | 320 `.cvcf`; firmware není definice projektu |
| Pictures | 1 179 PNG |
| WebPages | HTML, PNG a TTF, celkem 3 soubory |
| Templates, Animations, Documents, Fonts, Sounds | Prázdné |

Celkem 1 916 souborů. Metadata nalezena u 395 položek. U kontrolovaných
kontejnerů nebyla zjištěna chyba CRC; firmware ani běžné obrázky se touto
kontrolou neověřovaly.

## Použití při sestavování projektu

1. Vyhledat konkrétní definici jednotky/driveru/kolekce v katalogu podle modelu,
   připojení a verze. Nespoléhat pouze na podobnost názvu souboru.
2. Načíst originální zdroj z instalace, zachovat kód i připojené assety.
3. Vytvořit odpovídající definici zdroje v projektu s jedinečným ID a jménem.
4. Samostatně vytvořit instanci, její vlastnosti, vazby konektorů a konfiguraci.
   Přítomnost definice v projektu není vytvořená a zapojená instance.
5. Ověřit serializaci, vazby a následně načtení/kompilaci v CVC, pokud je požadováno.

Knihovna dodává komponenty, ale neurčuje konkrétní zapojení, adresy, názvy,
scénáře a vzhled budoucího projektu. Ty musí vycházet ze zadání.
Význam formátů s příponou končící `s` dosud nebyl ověřen; nepovažovat je
automaticky za totožné s variantou bez `s`.

## Další ověření parseru

Všech 17 projektů ze složky Plugins bylo zpracováno obecným parserem
`inspect-project.mjs` a zpětně serializováno. Všech 17 výsledků je bajtově
totožných s originály. Šestnáct souborů má hodnotu verze serializace 21,
projekt DALI Config 2.90 má 22. Výsledek je uložen u každé položky katalogu.
Toto potvrzuje podporu rámování těchto vzorků, nikoli kompletní sémantiku
všech objektů nebo možnost automaticky převádět verze.

Obnovení katalogu z kořenového adresáře pracovního prostoru:

```powershell
node cvc-driver-mcp/catalog-data.mjs
```

Volitelně lze zadat cestu k jiné instalaci a výstupnímu JSON jako dva argumenty.
