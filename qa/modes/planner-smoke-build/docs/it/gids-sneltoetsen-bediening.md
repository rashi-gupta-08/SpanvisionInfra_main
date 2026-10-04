# Scorciatoie da tastiera e comandi

Questa guida non elenca le scorciatoie da tastiera — quell'elenco vive già in un unico posto, e una
copia qui diventerebbe subito obsoleta. Invece, questa guida spiega **come richiamare sempre l'elenco
aggiornato**, e quali concetti di comando (menu contestuali, trascinamento, selezione a riquadro contro
panoramica, zoom) vale la pena capire da soli.

## Cosa imparerai qui

- Come aprire la panoramica delle scorciatoie sempre aggiornata.
- Cosa contiene ciascuno dei quattro menu contestuali nella vista Gantt.
- Come funziona il trascinamento: spostare una barra rispetto a disegnare una relazione.
- Quando un trascinamento su tela vuota esegue una panoramica, e quando seleziona a riquadro.
- Zoom, schede documento e modalità presentazione.
- Come riavviare il tour.

## La panoramica sempre aggiornata

Premi **Ctrl+/** (oppure **Cmd+/** su macOS) per aprire la panoramica delle scorciatoie — la stessa
finestra è raggiungibile anche tramite il pulsante **Scorciatoie da tastiera** sulla scheda della
barra multifunzione **Vista**. Questa finestra è di sola lettura ed è costruita direttamente dal
codice sorgente dell'app: una nuova scorciatoia compare qui automaticamente, senza un elenco separato
che qualcuno deve mantenere sincronizzato. Ecco esattamente perché questa guida non duplica l'elenco —
un secondo elenco mantenuto a mano prima o poi si discosterebbe da ciò che l'app fa realmente. La
finestra raggruppa le scorciatoie per categoria: File, Modifica, Struttura, Visualizza e Navigazione.

## Menu contestuali: quattro tipi, a seconda di dove fai clic destro

Fare clic destro nella vista Gantt dà un menu diverso a seconda di dove si trova il mouse:

- **Su una barra attività** — il menu completo dell'attività (modifica, inserisci, aggiungi
  sottoattività/traguardo/relazione, assegna calendario, avanzamento, priorità, traccia percorso,
  elimina…), più una voce extra specifica della barra in alto: **Avvia relazione da qui**.
- **Su una riga attività senza colpire una barra** (ad esempio una riga senza una barra attualmente
  visibile) — lo stesso menu attività, ma senza la voce specifica della barra.
- **Su una riga di intestazione di gruppo** (la riga che riassume un insieme raggruppato di attività)
  — un piccolo menu per comprimere/espandere quel singolo gruppo, più **Espandi tutto**/**Comprimi
  tutto**, che aprono o chiudono in un colpo solo tutte le fasce di gruppo (comprese quelle annidate
  dentro una fascia).
- **Su tela vuota** (nessuna attività, nessuna intestazione di gruppo) — **Nuova attività**,
  **Aggiungi traguardo**, **Incolla** (se c'è qualcosa negli appunti), **Reimposta zoom** e **Adatta
  al progetto**.

Quest'ultimo menu è stato verificato dal vivo: fare clic destro su un punto vuoto della tela Gantt
produce esattamente questi cinque elementi, in quest'ordine.

## Trascinamento su una barra attività

Afferrare e trascinare una barra attività sposta l'attività (oppure, afferrando il bordo, cambia la
sua durata). Mentre trascini un **bordo**, accanto a quel bordo compare una piccola pillola scura che
mostra la durata che otterrebbe l'attività — `15d`, per esempio, o `6h` per un'attività pianificata in
ore. Si aggiorna dal vivo mentre trascini, così vedi la nuova durata prima ancora di rilasciare il
pulsante del mouse. Spostare l'intera barra non la mostra: quel gesto lascia la durata invariata.
Tieni premuto **Shift** mentre trascini da una barra, e invece inizi a disegnare una **relazione**
verso qualunque attività su cui rilasci — la stessa cosa di **Avvia relazione da qui** nel menu
contestuale della barra, ma in un solo movimento del mouse.

Fai clic su una barra per selezionare solo quell'attività. **Ctrl/⌘+clic** su una barra la aggiunge o
la toglie dalla selezione corrente invece di sostituirla, così puoi costruire una selezione multipla
una barra alla volta — comodo appena prima di fare clic sul pulsante **Collegamento** con esattamente
due attività selezionate, o prima di trascinare un'intera selezione di attività in una nuova posizione
in un colpo solo nella tabella delle attività.

## Panoramica contro selezione a riquadro

Un trascinamento che inizia su uno spazio vuoto fa una di due cose, e ciò dipende da dove lo inizi e
dalla tua modalità di scorrimento (**Impostazioni → Scorrimento e zoom**):

- **Nella tabella delle attività** (la colonna a sinistra con WBS/nome/durata), un trascinamento su
  spazio vuoto è **sempre** una selezione a riquadro — la panoramica non avviene mai lì.
- **Nella tela Gantt stessa**: se la tua modalità di scorrimento è impostata su **Zoom + trascina**
  (panoramica stile mappa), la panoramica vince — esattamente come ti aspetteresti da un'applicazione
  di mappe. Nelle altre due modalità di scorrimento (**Posizione** o **Tasti**), lo stesso
  trascinamento su tela vuota è una selezione a riquadro, che ti permette di selezionare più attività
  contemporaneamente trascinando un rettangolo attorno a esse.

In breve: la tabella delle attività seleziona sempre; la tela esegue la panoramica solo in modalità
di scorrimento a trascinamento e altrimenti seleziona.

Al di là di ciò, c'è un gesto che funziona ovunque, sempre: trascinare con il **pulsante centrale del
mouse** (la rotellina) premuto pant la vista — in ogni modalità di scorrimento, e indipendentemente dal
fatto che tu inizi su una barra, nella tabella delle attività o su uno spazio vuoto. Comodo quando sei
in modalità Posizione o Tasti ma vuoi comunque un trascinamento rapido.

## Zoom

Oltre ai pulsanti di zoom sulla barra multifunzione, **+**/**=** (o **Ctrl+=**) ingrandisce e **-**
(o **Ctrl+-**) riduce. Un semplice **0** reimposta lo zoom al predefinito; **Ctrl+0** regola lo zoom in
modo che l'intero progetto stia sullo schermo ("adatta al progetto") — lo stesso del pulsante con quel
nome nel menu contestuale della tela vuota sopra. L'intestazione della timeline si adatta man mano che
ingrandisci: i numeri di settimana compaiono non appena c'è spazio per loro, e i nomi dei giorni
etichettano ogni colonna una volta che sei abbastanza vicino da lavorare a livello di giorno. Se
**Mostra solo i giorni lavorativi** (Impostazioni → Timeline / Zoom) è attivo, l'intestazione — e le
barre stesse — saltano interamente i fine settimana e i giorni festivi invece di limitarsi a
mostrarli in grigio, così un'attività di 5 giorni lavorativi è larga esattamente 5 colonne.

## Schede documento

Se hai più progetti aperti contemporaneamente (ciascuno nella propria scheda documento), **Ctrl+1**
fino a **Ctrl+9** saltano direttamente dalla prima alla nona scheda documento.

## Modalità presentazione

**F11** attiva/disattiva la modalità presentazione — una vista a schermo intero senza la barra
multifunzione e i pannelli laterali, pensata per mostrare la pianificazione senza gli elementi di
modifica intorno. **Esc** esce di nuovo dalla modalità presentazione (e, a una pressione successiva,
esegue il solito "deseleziona").

## Riavviare il tour

Vuoi rieseguire il tour introduttivo (ad esempio per mostrare l'app a qualcun altro)? Ci sono due
posti per farlo: il pulsante **Tour** sulla scheda della barra multifunzione **Vista**, oppure **Avvia
tour** nella navigazione Backstage (la riga appena sopra Impostazioni). Entrambi avviano il tour
immediatamente, senza mostrare prima la finestra di benvenuto.

## Per saperne di più

- Apri tu stesso la panoramica delle scorciatoie con **Ctrl+/** — quella è la fonte vincolante, non
  questa guida.
- Il comportamento di scorrimento e zoom si configura in **Impostazioni → Scorrimento e zoom**,
  disponibile in tutte e tre le posizioni fisse delle impostazioni dell'app (l'icona a ingranaggio, la
  scheda della barra multifunzione Impostazioni, e Backstage → Impostazioni).
