"""
Il modello che risponde: LM Studio, non Ollama.

**Perché è cambiato.** Il progetto d'origine parlava con Ollama su `/api/chat`.
La suite ha un modello solo per tutte le app — lo tiene acceso LM Studio, che
espone l'API di OpenAI su `127.0.0.1:1234` — e non ha nessun senso che il
Companion ne accenda un secondo: sarebbero due copie dello stesso modello nella
stessa memoria, su una macchina dove i GB liberi sono la risorsa scarsa.

**Cosa cambia davvero fra le due.** Poco, ed è per questo che il porto è corto:

| | Ollama | LM Studio (OpenAI) |
|---|---|---|
| chat | `/api/chat` | `/v1/chat/completions` |
| risposta | `data["message"]` | `data["choices"][0]["message"]` |
| contesto | `options.num_ctx` per domanda | si decide quando si **carica** il modello |
| strumenti | `tool_calls` con argomenti già oggetto | `tool_calls` con argomenti in una stringa JSON |
| risultato di uno strumento | messaggio `tool` e basta | messaggio `tool` **con** `tool_call_id` |
| embedding | `/api/embed` | `/v1/embeddings` |

Le ultime due righe sono le uniche che si sentono nel codice, e stanno qui
dentro: chi chiama non deve sapere con chi sta parlando.

**Il contesto non si passa più a ogni domanda.** In LM Studio è una proprietà
del modello caricato, e nella suite lo decide l'utente dai tre pulsanti
dell'hub — 64K, 128K, 256K. Il parametro resta nella firma perché il resto del
codice lo passa, e perché un giorno potrebbe tornare a contare: qui viene
ignorato, e questa riga è il posto dove è scritto che è voluto.
"""

from __future__ import annotations

import json

import httpx


def _alza_con_il_motivo(risposta: httpx.Response) -> None:
    """
    Sollevare dicendo **cosa** non è piaciuto a LM Studio.

    `raise_for_status()` da solo scrive «Client error 400 Bad Request» e butta
    via il corpo della risposta, che è l'unico posto dove c'è scritto il
    motivo — «No models loaded», «unknown field», il nome di un campo. È la
    stessa lezione della notte del 19 agosto: l'errore vero esisteva già, in un
    file, e mancava solo qualcuno che lo portasse dove uno stava guardando.
    """
    if risposta.is_success:
        return
    try:
        corpo = risposta.json()
        motivo = (corpo.get("error") or {}).get("message") or str(corpo)
    except Exception:
        motivo = risposta.text[:500]
    raise RuntimeError(f"LM Studio ha rifiutato la richiesta ({risposta.status_code}): {motivo}")


def _json_dalla_risposta(scelta: dict) -> dict:
    """
    Il JSON della risposta, cercato **anche dove non dovrebbe stare**.

    Certi modelli ragionano prima di rispondere, e mettono il ragionamento in un
    campo suo (`reasoning_content`). Chiedere di non ragionare non basta:
    `enable_thinking: False` alcuni lo onorano e altri lo ignorano — provato su
    questa macchina con `lfm2.5-2.6b`, che ha risposto con `content` **vuoto** e
    tutto il ragionamento di fianco. Da fuori sembrava che il modello non
    sapesse rispondere; in realtà aveva risposto nella casella sbagliata.

    Quindi: prima `content`, e se è vuoto si guarda nel ragionamento, dove il
    JSON di solito è ancora lì, magari dentro un blocco di codice. È lo stesso
    ripiego che la suite fa già in `llm.ts` per DaProdMusica.
    """
    messaggio = scelta.get("message") or {}
    for campo in ("content", "reasoning_content"):
        testo = (messaggio.get(campo) or "").strip()
        if not testo:
            continue
        letto = _prova_a_leggere(testo)
        if letto is not None:
            return letto
    return {}


def _prova_a_leggere(testo: str) -> dict | None:
    """Il primo oggetto JSON dentro questo testo, o `None` se non ce n'è."""
    try:
        letto = json.loads(testo)
        return letto if isinstance(letto, dict) else None
    except (TypeError, ValueError):
        pass

    # Un JSON avvolto in prosa o in un blocco di codice: si prende da graffa a
    # graffa. Grezzo di proposito — l'alternativa è un parser, per un caso che
    # o va così o non va affatto.
    inizio = testo.find("{")
    fine = testo.rfind("}")
    if inizio == -1 or fine <= inizio:
        return None
    try:
        letto = json.loads(testo[inizio : fine + 1])
    except (TypeError, ValueError):
        return None
    return letto if isinstance(letto, dict) else None


def _e_un_embedding(nome: str) -> bool:
    """
    Se questo modello serve a **trasformare frasi in numeri** e non a parlare.

    Si riconosce dal nome, che è tutto quello che LM Studio dice di un modello
    nell'elenco compatibile OpenAI. Non è una regola elegante, ma è quella
    giusta in pratica: chi pubblica un modello di embedding lo scrive nel nome
    (`text-embedding-nomic-embed-text-v1.5`, `bge-m3-embedding`...), perché
    serve a chi lo cerca.
    """
    return "embed" in nome.lower()


class SenzaEmbedding(RuntimeError):
    """Nessun modello sa trasformare una frase in numeri.

    Ha una classe sua perché non è un errore di rete da riprovare: è una cosa
    che manca, e chi chiama deve tirare dritto invece di insistere.
    """


class LmStudioClient:
    def __init__(self, base_url: str, *, timeout: float = 300.0) -> None:
        # Trecento secondi e non centoventi: su questa macchina, con un motore
        # di immagini acceso, la stessa domanda passa da cinque secondi a
        # duecentocinquanta. È misurato — vedi RIPRENDERE-DA-QUI.md, «Perché
        # Bonsai è lento» — e non è un guasto: è la CPU contesa. Un timeout
        # corto trasformerebbe una risposta lenta in un errore.
        self._client = httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=timeout)
        # I due ripieghi, risolti una volta sola e tenuti: vedi `_quale_modello`
        # e `_quale_embedding`. Sono due perché il modello che parla e quello
        # che trasforma in numeri non sono lo stesso mestiere.
        self._ripiego: str | None = None
        self._ripiego_embedding: str | None = None

    async def _quale_modello(self, model: str) -> str:
        """
        Il nome da mandare a LM Studio, che **non può essere vuoto**.

        Il caso normale è che arrivi dalla pagina: è il selettore comune della
        suite, lo stesso di DaProdMusica e DaProdFoto. Ma la prima volta non si
        è ancora scelto niente, e una richiesta senza nome fa rispondere
        `400 No models loaded` — un errore giusto e inutile da mostrare a
        qualcuno, perché di modelli installati ce ne sono eccome.

        Allora si prende il primo dell'elenco e lo si tiene: LM Studio lo carica
        da sé alla prima domanda. Si chiede una volta sola perché l'elenco non
        cambia mentre l'app è aperta, e perché sarebbe una richiesta in più
        prima di ogni frase.
        """
        if model:
            return model
        if self._ripiego is None:
            nomi = await self._elenco()
            # **Saltando gli embedding**, che sono un altro mestiere: sono in
            # elenco insieme agli altri, e su questa macchina il primo della
            # lista era proprio uno di quelli. LM Studio, a chi gli chiede una
            # conversazione a un modello di embedding, risponde «No models
            # loaded» — un messaggio che manda a cercare nel posto sbagliato.
            self._ripiego = next((n for n in nomi if not _e_un_embedding(n)), "")
        return self._ripiego

    async def _elenco(self) -> list[str]:
        """I modelli installati in LM Studio. Lista vuota se non si riesce a chiedere."""
        try:
            risposta = await self._client.get("/models")
            _alza_con_il_motivo(risposta)
            return [v.get("id", "") for v in (risposta.json().get("data") or []) if v.get("id")]
        except Exception:
            # Se non si riesce a chiedere si tira dritto, e sarà LM Studio a
            # dire cosa non va: meglio il suo errore che uno inventato qui.
            return []

    async def chat(self, *, model: str, messages: list[dict[str, str]], num_ctx: int) -> str:
        message = await self.chat_raw(model=model, messages=messages, num_ctx=num_ctx)
        return message.get("content") or ""

    async def chat_raw(
        self,
        *,
        model: str,
        messages: list[dict],
        num_ctx: int,
        tools: list[dict] | None = None,
    ) -> dict:
        """Il messaggio intero, non solo il testo: con `tools` può contenere
        `tool_calls` invece di (o oltre a) del testo."""
        payload: dict = {
            "model": await self._quale_modello(model),
            "messages": messages,
            "stream": False,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        response = await self._client.post("/chat/completions", json=payload)
        _alza_con_il_motivo(response)
        data = response.json()
        scelte = data.get("choices") or []
        if not scelte:
            raise RuntimeError("LM Studio ha risposto senza nessun messaggio.")
        return scelte[0].get("message") or {}

    async def chiedi_json(
        self,
        *,
        model: str,
        prompt: str,
        schema: dict,
        nome_schema: str = "risposta",
        max_tokens: int = 2048,
    ) -> dict:
        """
        Una risposta che deve **riempire dei campi**, non essere letta da una
        persona: il riassunto di un sogno, le entita' del grafo, la nota di
        passaggio della modalita' Quantum.

        Con lo schema il modello non *puo'* rispondere di fantasia, e non c'e'
        niente da interpretare. E' la stessa strada che la suite fa gia' in
        `llm.ts` per DaProdMusica: LM Studio vuole `json_schema` e rifiuta il
        generico `json_object`.

        **`enable_thinking: False` non e' un risparmio.** Qui serve estrazione,
        non ragionamento, e un modello pensante consumerebbe gran parte dello
        spazio in token di ragionamento prima di arrivare al JSON — troncandolo.
        E' successo davvero nel progetto d'origine, con 56 episodi da
        riassumere: il riassunto si interrompeva a meta' frase.

        Torna il dizionario gia' letto. Se il modello risponde qualcosa che JSON
        non e', torna un dizionario vuoto invece di sollevare: chi chiama sa
        gia' cosa fare quando non c'e' niente da salvare (saltare il giro), e
        non deve saperlo due volte.
        """
        payload = {
            "model": await self._quale_modello(model),
            "messages": [{"role": "user", "content": prompt}],
            "stream": False,
            "max_tokens": max_tokens,
            "chat_template_kwargs": {"enable_thinking": False},
            "response_format": {
                "type": "json_schema",
                "json_schema": {"name": nome_schema, "strict": True, "schema": schema},
            },
        }
        response = await self._client.post("/chat/completions", json=payload)
        _alza_con_il_motivo(response)
        dati = response.json()
        scelte = dati.get("choices") or []
        if not scelte:
            return {}
        return _json_dalla_risposta(scelte[0])

    async def _quale_embedding(self, model: str) -> str:
        """
        Il modello che trasforma una frase in numeri, che **non è quello che
        parla**.

        Qui il ripiego di `_quale_modello` non va bene: mandare una frase da
        trasformare a un modello di conversazione dà `400`, e lo darebbe a ogni
        messaggio. Si cerca invece un modello che dichiari di essere un
        embedding — nei nomi di LM Studio si riconoscono dalla parola stessa — e
        se non ce n'è nessuno si torna stringa vuota, che qui vuol dire
        «non provarci».
        """
        if model:
            return model
        if self._ripiego_embedding is None:
            nomi = await self._elenco()
            self._ripiego_embedding = next((n for n in nomi if _e_un_embedding(n)), "")
        return self._ripiego_embedding

    async def embed(self, *, model: str, text: str) -> list[float]:
        """
        La frase trasformata in numeri: è quello che rende cercabile la memoria.

        Solleva se non c'è nessun modello capace di farlo, e chi chiama lo sa
        già gestire: senza embedding il Companion perde la memoria a lungo
        termine ma continua a parlare, ricordando gli ultimi scambi. È un
        degrado, non un guasto — la stessa scelta fatta per la voce.
        """
        quale = await self._quale_embedding(model)
        if not quale:
            raise SenzaEmbedding(
                "In LM Studio non c'è nessun modello per gli embedding: la "
                "conversazione va avanti, ma senza cercare fra i ricordi vecchi."
            )
        response = await self._client.post("/embeddings", json={"model": quale, "input": text})
        _alza_con_il_motivo(response)
        data = response.json()
        return data["data"][0]["embedding"]

    async def aclose(self) -> None:
        await self._client.aclose()


def argomenti_dello_strumento(chiamata: dict) -> dict:
    """
    Gli argomenti di una `tool_call`, da qualunque forma arrivino.

    OpenAI li manda come **stringa** JSON, Ollama come oggetto già pronto. Il
    codice che li usa non deve sapere quale delle due: qui si normalizza, e una
    stringa che non è JSON valido diventa un dizionario vuoto invece di
    un'eccezione che fa saltare tutto il turno.
    """
    grezzi = (chiamata.get("function") or {}).get("arguments")
    if isinstance(grezzi, dict):
        return grezzi
    if not grezzi:
        return {}
    try:
        letti = json.loads(grezzi)
    except (TypeError, ValueError):
        return {}
    return letti if isinstance(letti, dict) else {}
