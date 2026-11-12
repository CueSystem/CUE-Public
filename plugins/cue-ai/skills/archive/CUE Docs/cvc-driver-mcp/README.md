# CVC Driver MCP — lokální prototyp

Pro další práci se strukturou projektů nejprve čtěte **CVCP-FORMAT.md**.
Obsahuje poznatky z HouseNechanice.cvcp, odděluje ověřené rámování od odhadů
významu polí a odkazuje na obecný parser `inspect-project.mjs`.

Instalované komponenty a jejich katalog popisuje **DATA-LIBRARY.md**;
index obnovuje `catalog-data.mjs` bez změn instalace CVC.

`project.mjs` navíc obsahuje experimentální generátor minimálního projektu `.cvcp`:
`encodeProject({name, source, manufacturer})`. Sestavuje hlavičku, modul MyCommon,
jeden reléový driver, konfiguraci a CRC32 z jednotlivých polí bez načítání šablony.
`inspectMinimalProject` čte tento omezený formát; jeho čtení bylo ověřeno i na
původním projektu exportovaném CVC. Nově generovaný projekt byl ověřen strukturálně,
nikoli otevřením v CVC. Test: `node --test project.test.mjs`.

MCP server přijme připravený XPL2 source a vytvoří nový `.cvcd` driver pro CUE Visual Composer. Běží lokálně přes stdio, bez npm závislostí a bez síťového přístupu. Vyžaduje Node.js 20 nebo novější.

## Rozsah

- Nástroj `create_relay_driver` přijímá `name`, `source` a volitelně `manufacturer` (výchozí `Custom`).
- Podporuje minimální driver typu **Other**, připojení **Relay**, bez dalších assetů.
- Jméno musí odpovídat deklaraci `Global DeviceClass` v kompletním zdrojovém kódu.
- Výstup ukládá do `generated` vedle serveru, případně adresáře nastaveného proměnnou `CVC_DRIVER_OUTPUT_DIR`.
- Existující soubory nepřepisuje. Pro novou variantu použijte nový název i odpovídající třídu.
- Nekompiluje XPL2, nemění otevřený projekt, neovládá relé a nic nenahrává do kontroléru.

Jde o experimentální adaptér exportního formátu, nikoli oficiální API nebo změnu binárního programu CVC. Formát byl odvozen z vlastního exportu a import `RelayDriverMCP.cvcd` byl ověřen v CVC **24.00.1450**. Jiná vydání CVC a složitější drivery nejsou ověřeny.

## Použití

Spuštění: `node server.mjs`. Testy: `node --test test.mjs`.

Volání MCP nástroje:

```json
{"name":"create_relay_driver","arguments":{"name":"DemoRelay","source":"Global DeviceClass DemoRelay\n    Connector RelayConnector\n    Public Function On()\n        RelayConnector.Close()\n    End Function\nEnd DeviceClass\n"}}
```

Odpověď obsahuje absolutní cestu k vytvořenému souboru a `importedIntoCvc: false`.

Vložení v CVC: pravým tlačítkem v **MyProject Resources → Insert → Device → Insert device from other location** a vybrat vrácený soubor. Tento krok lze provést přes Computer Use; není součástí MCP serveru. Poté uložit projekt. Kompilaci a funkci driveru ověřit v projektu s odpovídající instancí a kontrolérem.

Ukázka se zapnutím, vypnutím a timeoutem je v `examples/RelayDriverMCP.xpl2`.

## Registrace

V Codex CLI: `codex mcp add cvc-driver -- node "ABSOLUTNI_CESTA/server.mjs"`.
Na tomto PC je vhodné použít absolutní cestu k Node.exe. Nový chat nebo restart klienta může být potřeba pro načtení přidaného MCP serveru.

Obecná konfigurace MCP klienta:

```json
{"mcpServers":{"cvc-driver":{"command":"node","args":["ABSOLUTNI_CESTA/server.mjs"]}}}
```

## Formát a ověření

Soubor obsahuje CRC32 celého těla (little-endian), hlavičku minimálního zařízení, UTF-16LE metadata a zdrojový kód komprimovaný zlib. Testy kontrolují standardní CRC vektor, Unicode roundtrip, délky, odmítnutí neplatných vstupů a skutečný MCP proces včetně ochrany před přepsáním. Kontrola deklarace není parser ani kompilátor XPL2.
