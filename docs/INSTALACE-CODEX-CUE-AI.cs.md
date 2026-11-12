# Instalace Codexu nebo Claude Code a pluginu CUE AI ve Windows

Tento návod vás provede instalací Codexu nebo Claude Code, přidáním pluginu **CUE AI** z veřejného
repozitáře [CueSystem/CUE-Public](https://github.com/CueSystem/CUE-Public)
a prvním ověřením připojení ke CUE Visual Composeru.

Vyberte si klienta: kroky 1–7 popisují Codex, samostatná část **Claude Code** níže
obsahuje druhou možnost. Pro použití CUE AI stačí jeden z těchto klientů.

Postup je určen pro Windows na počítači, kde běží CVC. Podoba obrazovek se může
mezi verzemi aplikace lišit. Postup vychází z oficiální dokumentace ověřené
12. listopadu 2026.

## 1. Nainstalujte aplikaci a přihlaste se

1. Otevřete [oficiální návod a stažení desktopové aplikace](https://learn.chatgpt.com/docs/quickstart).
2. Stáhněte verzi pro Windows a dokončete instalaci.
3. Spusťte aplikaci a přihlaste se svým účtem ChatGPT.
4. Pokud aplikace nabízí přepínač ChatGPT/Codex, vyberte **Codex**.
5. Přidejte jako projekt složku, ve které budete mít své CVC projekty.

V aktuální dokumentaci je Codex součástí desktopové aplikace ChatGPT. U starší
samostatné aplikace Codex aktualizujte aplikaci a řiďte se dostupnými položkami.
Přihlášení a dostupné funkce závisejí na účtu a nastavení vašeho workspace.

Zdroj: [oficiální rychlý start](https://learn.chatgpt.com/docs/quickstart).

## 2. Připravte příkaz `codex`

Pro přidání našeho GitHub marketplace použijeme PowerShell. Otevřete nové okno
PowerShellu a zadejte:

```powershell
codex --version
git --version
```

Pokud oba příkazy zobrazí verzi, pokračujte krokem 3.

Pokud příkaz `codex` není dostupný, nainstalujte Codex CLI oficiálním instalátorem:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
```

Potom otevřete nové okno PowerShellu a zopakujte `codex --version`.
Tento příkaz pro tento běh spouští oficiální instalační skript; trvale nemění
Execution Policy. Pokud firemní pravidla instalaci blokují, použijte postup
schválený vaším správcem.

Pokud chybí Git, nainstalujte Git pro Windows a znovu otevřete PowerShell.
Git slouží ke stažení pluginu z repozitáře. Veřejný repozitář nevyžaduje
GitHub účet ani GitHub plugin.

Zdroj: [oficiální instalace Codex CLI](https://learn.chatgpt.com/docs/codex/cli).

## 3. Přidejte zdroj pluginu z GitHubu

V PowerShellu spusťte:

```powershell
codex plugin marketplace add https://github.com/CueSystem/CUE-Public.git
codex plugin marketplace list
```

Ve výpisu by se měl objevit marketplace **`cue-ai-local`**. Jeho název v nabídce
aplikace je **CUE AI**. Slovo `local` v identifikátoru je název katalogu;
zdroj se v tomto postupu stahuje z GitHubu.

Přidání marketplace zpřístupní katalog pluginů. Další krok nainstaluje samotný plugin.

Zdroj: [oficiální postup pro plugin marketplaces](https://developers.openai.com/plugins/build/plugins).

## 4. Nainstalujte CUE AI

1. V desktopové aplikaci otevřete **Plugins**.
2. Vyberte zdroj **CUE AI** (`cue-ai-local`).
3. Otevřete plugin **CUE AI** a zvolte **Install / Nainstalovat**.
4. Dokončete případné požadavky aplikace a ověřte, že je plugin povolený.
5. Otevřete **nový chat** a vyberte v něm plugin CUE AI.

Pokud zdroj ještě nevidíte, aplikaci úplně ukončete a znovu spusťte.
Použijte stejný Windows účet pro PowerShell i desktopovou aplikaci.

Plugin obsahuje:

| Součást | Účel |
| --- | --- |
| `cvc` | Ovládání CUE Visual Composeru přes MCP |
| `cue-docs` | Vyhledávání v dokumentaci CUE |
| `cue-visual-composer` | Postupy pro CVC projekty, reference a pomocné skripty |

Skill je součástí pluginu; není potřeba zvlášť instalovat původní ZIP.

Zdroj pro instalaci a nový chat: [oficiální dokumentace pluginů](https://developers.openai.com/plugins/build/plugins).

## 5. Připravte CUE Visual Composer

1. Spusťte CUE Visual Composer s podporou MCP.
2. Podle dokumentace vaší verze CVC zapněte MCP server, pokud není zapnutý.
3. Ověřte, že naslouchá na `http://127.0.0.1:8765/mcp`.
4. Nechte CVC spuštěný během práce v Codexu.

Plugin CVC ani jeho MCP server neinstaluje a nespouští. Umístění přepínače MCP
závisí na konkrétní verzi CVC; návod proto nepředpokládá konkrétní položku menu.

Rychlá kontrola portu v PowerShellu:

```powershell
Test-NetConnection 127.0.0.1 -Port 8765
```

Hodnota `TcpTestSucceeded : True` potvrzuje otevřený port. Funkčnost MCP ověříte
v následujícím kroku. Otevření endpointu v běžném prohlížeči nemusí zobrazit stránku,
protože jde o protokol MCP.

## 6. Ověřte plugin v novém chatu

Vyberte CUE AI a pošlete tento požadavek:

> Použij plugin CUE AI. Přes CVC MCP načti informace o aplikaci pomocí
> get_application_info a přes CUE Docs vyhledej dokumentaci k CUE Visual Composeru.
> Uveď výsledek každého volání. Projekt neotevírej ani neupravuj.

Úspěšný výsledek obsahuje údaje vrácené CVC a výsledek vyhledávání v dokumentaci.
Pokud Codex hlásí, že nástroje nemá, zkontrolujte instalaci, výběr pluginu a nový chat.

Pro ověření skillu následně napište:

> Použij skill cue-visual-composer z pluginu CUE AI a popiš postup kontroly
> existujícího CVCP projektu. Zatím žádné soubory neměň.

Pomocné skripty přibalené ke skillu potřebují Node.js 18 nebo novější. Pro samotná
HTTP spojení na MCP servery jej nepotřebujete.

## 7. První práce na projektu

Příklad zadání:

> Pomocí CUE AI zkontroluj projekt ve složce tohoto chatu. Nejprve načti aktuální
> stav v CVC a potřebnou dokumentaci. Před úpravami vytvoř zálohu a na konci odděl
> kontrolu souboru, výsledek kompilace a ověření simulace.

Konkrétní změny provádějte až nad vaším projektem. Součástí pluginu jsou také
archivní ukázky s experimentálními skripty a původními cestami; jejich přítomnost
neznamená, že se automaticky spouštějí nebo že představují ověřené vzory pro nasazení.

## Aktualizace a řešení potíží

Novou verzi katalogu stáhnete příkazem:

```powershell
codex plugin marketplace upgrade cue-ai-local
```

Potom zkontrolujte aktualizaci pluginu v nabídce Plugins, případně aplikaci
restartujte, a otevřete nový chat.

| Problém | Co zkontrolovat |
| --- | --- |
| `codex` není rozpoznán | Dokončete instalaci CLI a otevřete nové okno PowerShellu. |
| `plugin marketplace` není podporován | Aktualizujte Codex CLI. |
| CUE AI není v katalogu | Spusťte `codex plugin marketplace list`, ověřte Windows účet a restartujte aplikaci. |
| Nástroje se v chatu neobjevily | Ověřte instalaci a povolení pluginu, vyberte ho a otevřete nový chat. |
| CVC spojení je odmítnuté | Ověřte běžící CVC, podporu MCP a port 8765. |
| CVC není dostupný z cloudu nebo WSL | Použijte Codex přímo ve Windows na počítači s CVC; `127.0.0.1` označuje prostředí klienta. |
| Dokumentace není dostupná | Zkontrolujte internet, proxy a přístup k `www.cuesystem.com`. |

## Claude Code: instalace a připojení CUE AI

### A. Nainstalujte Claude Code

V PowerShellu spusťte oficiální instalátor:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Otevřete nové okno PowerShellu a ověřte instalaci:

```powershell
claude --version
```

Pro práci s repozitářem doporučujeme také Git pro Windows. Claude Code používejte
přímo ve Windows na počítači s CVC, aby lokální endpoint ukazoval na správný počítač.

Zdroj: [oficiální instalace Claude Code](https://code.claude.com/docs/en/setup).

### B. Přihlaste se a vyberte projekt

Přejděte do své existující složky s CVC projektem; cestu v příkladu nahraďte vlastní:

```powershell
Set-Location 'C:\CUE\MojeProjekty'
claude
```

Při prvním spuštění dokončete přihlášení v prohlížeči podle pokynů Claude Code.
Potřebujete účet nebo firemní přístup podporující Claude Code. Účet ChatGPT
pro přihlášení do Claude Code neslouží. V otevřené relaci lze přihlášení vyvolat
příkazem `/login`. Pak relaci ukončete příkazem `/exit` a pokračujte v PowerShellu.

Zdroj: [první spuštění a přihlášení](https://code.claude.com/docs/en/quickstart).

### C. Přidejte marketplace a nainstalujte plugin

V PowerShellu, mimo běžící relaci Claude Code:

```powershell
claude plugin marketplace add CueSystem/CUE-Public
claude plugin install cue-ai@cue-ai-local
claude plugin list
```

Ve výpisu zkontrolujte `cue-ai@cue-ai-local` a stav povoleného pluginu. Tato instalace
je pro vašeho uživatele; samostatná instalace původního ZIP se skills není potřeba.

Zdroj: [instalace pluginů ze shellu](https://code.claude.com/docs/en/discover-plugins).

### D. Ověřte MCP a skill

Spusťte CVC s MCP podle kroku 5 výše. Ve složce projektu otevřete novou relaci:

```powershell
claude
```

Následující příkazy zadávejte uvnitř Claude Code, nikoli do PowerShellu:

```text
/mcp
```

Zkontrolujte oba servery: `cvc` a `cue-docs`. V seznamu mohou mít navíc prefix
pluginu. Potom napište:

> Pomocí nástrojů pluginu CUE AI načti informace o CVC přes get_application_info
> a vyhledej v CUE Docs dokumentaci k CUE Visual Composeru. Uveď výsledek obou
> volání. Projekt neotevírej ani neupravuj.

Skill vyvolejte přímo:

```text
/cue-ai:cue-visual-composer
```

Zadejte například kontrolu existujícího projektu bez změn. Příkaz `/plugin`
otevře správu pluginů a případné chyby načtení. Pokud se plugin nenačetl,
ukončete relaci přes `/exit` a spusťte `claude` znovu.

Zdroj: [kontrola instalace a skills](https://code.claude.com/docs/en/discover-plugins),
[připojení MCP](https://code.claude.com/docs/en/mcp).

### E. Aktualizace a potíže

V PowerShellu obnovte katalog i plugin:

```powershell
claude plugin marketplace update cue-ai-local
claude plugin update cue-ai@cue-ai-local
```

Potom otevřete novou relaci. Pokud `claude` není rozpoznán, otevřete nové okno
PowerShellu a zkontrolujte instalaci a PATH. Při chybě připojení CVC ověřte
port 8765 a běžící CVC; při chybě dokumentace přístup na internet.
Příkazy s úvodním `/` patří do relace Claude Code, příkazy začínající `claude`
do PowerShellu.

Zdroj: [aktualizace pluginů a marketplaces](https://code.claude.com/docs/en/discover-plugins).

## Technická kontrola ze staženého repozitáře — oba klienti

Pro správce nebo při diagnostice, s nainstalovaným Gitem a Node.js 18+:

```powershell
git clone https://github.com/CueSystem/CUE-Public.git
Set-Location CUE-Public
node scripts/validate-plugin.mjs
node scripts/check-mcp.mjs
```

První kontrola ověří soubory a manifesty. Druhá ověří obě živá MCP spojení
a provede pouze čtecí volání. Zelená kontrola balíčku v GitHub Actions potvrzuje
úplnost a sestavení pluginu; dostupnost CVC se ověřuje na konkrétním počítači.
