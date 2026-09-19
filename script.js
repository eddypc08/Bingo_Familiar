// CONFIGURACIÓN DE ARCHIVOS
const RUTA_MUSICA_FONDO = 'Sound/musica_fondo.mp3';

// Configuración del Juego
const TOTAL_NUMEROS = 90;
const MINIMO_NUMEROS_BINGO = 15;
const VELOCIDADES = [
  { texto: 'x0.5 (5s)', ms: 5000 },
  { texto: 'x1 (4s)',   ms: 4000 },
  { texto: 'x1.5 (3s)', ms: 3000 },
  { texto: 'x2 (2s)',   ms: 2000 }
];

// Estado del Juego
let disponibles = [];
let sorteados = [];
let jugando = false;
let intervalo = null;
let timeoutInicio = null;
let velocidadIdx = 0;
let enRecuento = false;
let lineaSeleccionada = null; // 'L1', 'L2', 'L3'

// PeerJS Control Remoto
let peer = null;
let peerConn = null;
let roomCode = null;
let isRemoteController = false;

// Audio de Fondo
let bgMusic = null;
let bgMuted = false;

// Elementos DOM Principales
const mainMenu = document.getElementById('main-menu');
const gameView = document.getElementById('game-view');
const remoteControlView = document.getElementById('remote-control-view');
const headerTitle = document.getElementById('header-title');

const board = document.getElementById('board');
const numberDisplay = document.getElementById('number-display');
const drawnHistory = document.getElementById('drawn-history');

const btnStart = document.getElementById('btn-start');
const startText = document.getElementById('start-text');
const btnPause = document.getElementById('btn-pause');
const btnSpeed = document.getElementById('btn-speed');
const speedText = document.getElementById('speed-text');
const btnRecount = document.getElementById('btn-recount');
const btnReset = document.getElementById('btn-reset');
const btnBingo = document.getElementById('btn-bingo');
const btnHome = document.getElementById('btn-home');

const btnL1 = document.getElementById('btn-l1');
const btnL2 = document.getElementById('btn-l2');
const btnL3 = document.getElementById('btn-l3');
const ticketStrikeLine = document.getElementById('ticket-strike-line');
const remoteTicketStrikeLine = document.getElementById('remote-ticket-strike-line');

const btnMuteBgm = document.getElementById('btn-mute-bgm');
const iconSoundOn = document.getElementById('icon-sound-on');
const iconSoundOff = document.getElementById('icon-sound-off');

const modalReset = document.getElementById('modal-overlay');
const btnConfirmYes = document.getElementById('btn-confirm-yes');
const btnConfirmNo = document.getElementById('btn-confirm-no');

const modalRules = document.getElementById('modal-rules');
const btnMenuPlay = document.getElementById('btn-menu-play');
const btnMenuRemote = document.getElementById('btn-menu-remote');
const btnMenuRules = document.getElementById('btn-menu-rules');
const btnCloseRules = document.getElementById('btn-close-rules');
const bingoOverlay = document.getElementById('bingo-overlay');

// Elementos Conexión Remota
const roomCodeBadge = document.getElementById('room-code-badge');
const displayRoomCode = document.getElementById('display-room-code');
const modalConnectRemote = document.getElementById('modal-connect-remote');
const inputRoomCode = document.getElementById('input-room-code');
const connectError = document.getElementById('connect-error');
const btnSubmitConnect = document.getElementById('btn-submit-connect');
const btnCancelConnect = document.getElementById('btn-cancel-connect');

const headerRemoteStatus = document.getElementById('header-remote-status');
const headerConnectedCode = document.getElementById('header-connected-code');
const remoteConnectedCode = document.getElementById('remote-connected-code');

// Botones del Control Remoto
const remoteBtnStart = document.getElementById('remote-btn-start');
const remoteBtnPause = document.getElementById('remote-btn-pause');
const remoteBtnSpeed = document.getElementById('remote-btn-speed');
const remoteBtnRecount = document.getElementById('remote-btn-recount');
const remoteBtnReset = document.getElementById('remote-btn-reset');
const remoteBtnBingo = document.getElementById('remote-btn-bingo');
const remoteBtnL1 = document.getElementById('remote-btn-l1');
const remoteBtnL2 = document.getElementById('remote-btn-l2');
const remoteBtnL3 = document.getElementById('remote-btn-l3');

// Inicialización
function init() {
  crearTablero();
  resetearJuego();
  inicializarMusicaFondo();
  configurarEventos();
  inicializarHostPeer();
}

// Genera un código simple de 4 dígitos para conectar
function generarCodigoSala() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Inicializar PeerJS en la Laptop (Servidor/Host)
function inicializarHostPeer() {
  roomCode = generarCodigoSala();
  const peerId = `castro-lopez-bingo-${roomCode}`;
  peer = new Peer(peerId);

  peer.on('open', (id) => {
    displayRoomCode.textContent = roomCode;
    roomCodeBadge.classList.remove('hidden');
  });

  peer.on('connection', (conn) => {
    peerConn = conn;
    
    // Notificar conexión exitosa en la pantalla del juego
    headerConnectedCode.textContent = roomCode;
    headerRemoteStatus.classList.remove('hidden');

    peerConn.on('data', (data) => {
      procesarComandoRemoto(data);
    });

    peerConn.on('close', () => {
      headerRemoteStatus.classList.add('hidden');
    });
  });

  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      inicializarHostPeer();
    }
  });
}

// Conectar desde el Celular al Host de la Laptop
function conectarControlRemoto(codigoIngresado) {
  const targetPeerId = `castro-lopez-bingo-${codigoIngresado}`;
  peer = new Peer();

  peer.on('open', () => {
    peerConn = peer.connect(targetPeerId);

    peerConn.on('open', () => {
      isRemoteController = true;
      remoteConnectedCode.textContent = codigoIngresado;
      modalConnectRemote.classList.add('hidden');
      mainMenu.classList.add('hidden');
      remoteControlView.classList.remove('hidden');
    });

    peerConn.on('data', (data) => {
      if (data.cmd === 'SYNC_LINE') {
        aplicarUISeleccionarLinea(data.payload);
      }
    });

    peerConn.on('error', () => {
      connectError.classList.remove('hidden');
    });
  });

  peer.on('error', () => {
    connectError.classList.remove('hidden');
  });
}

// Enviar comandos del celular a la laptop
function enviarComando(cmd, payload = null) {
  if (peerConn && peerConn.open) {
    peerConn.send({ cmd, payload });
  }
}

// Procesar en la Laptop los comandos recibidos desde el Celular
function procesarComandoRemoto(data) {
  switch (data.cmd) {
    case 'START': iniciarJuego(); break;
    case 'PAUSE': pararJuego(true); break;
    case 'SPEED': btnSpeed.click(); break;
    case 'RECOUNT': ejecutarRecuento(); break;
    case 'L1': seleccionarLinea('L1'); break;
    case 'L2': seleccionarLinea('L2'); break;
    case 'L3': seleccionarLinea('L3'); break;
    case 'RESET': modalReset.classList.remove('hidden'); break;
    case 'CONFIRM_RESET': resetearJuego(); break;
    case 'BINGO': 
      if (sorteados.length >= MINIMO_NUMEROS_BINGO) {
        btnBingo.click();
      }
      break;
  }
}

// Inicializar Audio
function inicializarMusicaFondo() {
  bgMusic = new Audio(RUTA_MUSICA_FONDO);
  bgMusic.loop = true;
  bgMusic.volume = 0.1;
}

// Reproducir sonido táctil
function reproducirSonidoBoton() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {}
}

function toggleMuteBgMusic() {
  bgMuted = !bgMuted;
  if (bgMusic) bgMusic.muted = bgMuted;
  
  if (bgMuted) {
    iconSoundOn.classList.add('hidden');
    iconSoundOff.classList.remove('hidden');
  } else {
    iconSoundOff.classList.add('hidden');
    iconSoundOn.classList.remove('hidden');
  }
}

function crearTablero() {
  board.innerHTML = '';
  for (let i = 1; i <= TOTAL_NUMEROS; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.id = `cell-${i}`;
    cell.textContent = i;
    board.appendChild(cell);
  }
}

function resetearJuego() {
  pararJuego(false);
  disponibles = Array.from({ length: TOTAL_NUMEROS }, (_, i) => i + 1);
  sorteados = [];
  enRecuento = false;
  numberDisplay.textContent = '--';
  drawnHistory.innerHTML = '';

  for (let i = 1; i <= TOTAL_NUMEROS; i++) {
    const cell = document.getElementById(`cell-${i}`);
    if (cell) cell.classList.remove('active');
  }

  desactivarLinea();
  actualizarEstadoBingo();
}

function extraerNumero() {
  if (!jugando) return;

  if (disponibles.length === 0) {
    pararJuego(false);
    cantarTexto("¡Fin del juego! Salieron todos los números.");
    return;
  }

  const idxAleatorio = Math.floor(Math.random() * disponibles.length);
  const num = disponibles.splice(idxAleatorio, 1)[0];
  sorteados.push(num);

  mostrarNumero(num);
  cantarTexto(`${num}`);
  actualizarEstadoBingo();
}

function mostrarNumero(num) {
  numberDisplay.textContent = num;

  const cell = document.getElementById(`cell-${num}`);
  if (cell) cell.classList.add('active');

  actualizarHistorial();
}

function actualizarHistorial() {
  drawnHistory.innerHTML = '';
  const ultimos = sorteados.slice(-15).reverse();
  ultimos.forEach(n => {
    const mini = document.createElement('div');
    mini.classList.add('mini-ball');
    mini.textContent = n;
    drawnHistory.appendChild(mini);
  });
}

function actualizarEstadoBingo() {
  const listo = sorteados.length >= MINIMO_NUMEROS_BINGO;

  if (btnBingo) {
    btnBingo.disabled = !listo;
    if (listo) {
      btnBingo.classList.remove('disabled');
      btnBingo.title = "¡Presiona si hay ganador!";
    } else {
      btnBingo.classList.add('disabled');
      btnBingo.title = `Faltan ${MINIMO_NUMEROS_BINGO - sorteados.length} números para activar BINGO`;
    }
  }

  if (remoteBtnBingo) {
    remoteBtnBingo.disabled = !listo;
    if (listo) {
      remoteBtnBingo.classList.remove('disabled');
    } else {
      remoteBtnBingo.classList.add('disabled');
    }
  }
}

function iniciarJuego() {
  if (jugando || enRecuento) return;

  if (!lineaSeleccionada) {
    cantarTexto("Seleccione una línea para iniciar el juego");
    return;
  }

  limpiarTemporizadores();

  if (bgMusic && bgMusic.paused) {
    bgMusic.play().catch(() => {});
  }

  const esInicioNuevo = sorteados.length === 0;
  jugando = true;
  startText.textContent = 'Jugando...';

  if (esInicioNuevo) {
    const nombreLinea = lineaSeleccionada === 'L1' ? 'la línea de arriba' : (lineaSeleccionada === 'L2' ? 'la línea del medio' : 'la línea de abajo');
    const mensajeInicio = `¿Listo familia? vamos a jugar ${nombreLinea}`;
    cantarTexto(mensajeInicio);
    
    const tiempoEspera = Math.max(5000, mensajeInicio.length * 90);

    timeoutInicio = setTimeout(() => {
      if (jugando) {
        extraerNumero();
        intervalo = setInterval(extraerNumero, VELOCIDADES[velocidadIdx].ms);
      }
    }, tiempoEspera);

  } else {
    const ultimoNumero = sorteados[sorteados.length - 1];
    const mensajeReanudar = `Juego reanudado. Nos quedamos en el número ${ultimoNumero}`;
    cantarTexto(mensajeReanudar);

    const tiempoEspera = Math.max(4500, mensajeReanudar.length * 90);

    timeoutInicio = setTimeout(() => {
      if (jugando) {
        extraerNumero();
        intervalo = setInterval(extraerNumero, VELOCIDADES[velocidadIdx].ms);
      }
    }, tiempoEspera);
  }
}

function limpiarTemporizadores() {
  if (intervalo) { clearInterval(intervalo); intervalo = null; }
  if (timeoutInicio) { clearTimeout(timeoutInicio); timeoutInicio = null; }
}

function pararJuego(anunciar = true) {
  const estabaJugando = jugando;
  jugando = false;
  
  limpiarTemporizadores();

  if (bgMusic && !bgMusic.paused) {
    bgMusic.pause();
  }

  startText.textContent = sorteados.length > 0 ? 'Reanudar' : 'Iniciar';

  if (estabaJugando && anunciar) {
    cantarTexto("Juego pausado");
  }
}

function ejecutarRecuento() {
  if (sorteados.length === 0) return;

  pararJuego(false);
  enRecuento = true;

  const ordenados = [...sorteados].sort((a, b) => a - b);
  let idx = 0;

  cantarTexto("Iniciando recuento");

  timeoutInicio = setTimeout(() => {
    intervalo = setInterval(() => {
      if (idx < ordenados.length) {
        const num = ordenados[idx];
        numberDisplay.textContent = num;
        cantarTexto(`${num}`);
        idx++;
      } else {
        limpiarTemporizadores();
        enRecuento = false;
        if (sorteados.length > 0) {
          numberDisplay.textContent = sorteados[sorteados.length - 1];
        }
      }
    }, 1200);
  }, 2000);
}

function seleccionarLinea(linea) {
  if (lineaSeleccionada === linea) {
    desactivarLinea();
    enviarComando('SYNC_LINE', null);
    return;
  }

  lineaSeleccionada = linea;
  aplicarUISeleccionarLinea(linea);

  if (!isRemoteController) {
    enviarComando('SYNC_LINE', linea);
  }
}

function aplicarUISeleccionarLinea(linea) {
  lineaSeleccionada = linea;

  [btnL1, btnL2, btnL3, remoteBtnL1, remoteBtnL2, remoteBtnL3].forEach(btn => btn?.classList.remove('active'));

  if (ticketStrikeLine) {
    ticketStrikeLine.classList.remove('hidden', 'line-1', 'line-2', 'line-3');
  }
  if (remoteTicketStrikeLine) {
    remoteTicketStrikeLine.classList.remove('hidden', 'line-1', 'line-2', 'line-3');
  }

  if (!linea) {
    desactivarLinea();
    return;
  }

  if (linea === 'L1') {
    btnL1?.classList.add('active');
    remoteBtnL1?.classList.add('active');
    ticketStrikeLine?.classList.add('line-1');
    remoteTicketStrikeLine?.classList.add('line-1');
  } else if (linea === 'L2') {
    btnL2?.classList.add('active');
    remoteBtnL2?.classList.add('active');
    ticketStrikeLine?.classList.add('line-2');
    remoteTicketStrikeLine?.classList.add('line-2');
  } else if (linea === 'L3') {
    btnL3?.classList.add('active');
    remoteBtnL3?.classList.add('active');
    ticketStrikeLine?.classList.add('line-3');
    remoteTicketStrikeLine?.classList.add('line-3');
  }
}

function desactivarLinea() {
  lineaSeleccionada = null;
  [btnL1, btnL2, btnL3, remoteBtnL1, remoteBtnL2, remoteBtnL3].forEach(btn => btn?.classList.remove('active'));

  if (ticketStrikeLine) {
    ticketStrikeLine.classList.add('hidden');
    ticketStrikeLine.classList.remove('line-1', 'line-2', 'line-3');
  }
  if (remoteTicketStrikeLine) {
    remoteTicketStrikeLine.classList.add('hidden');
    remoteTicketStrikeLine.classList.remove('line-1', 'line-2', 'line-3');
  }
}

function cantarTexto(texto) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }
}

function configurarEventos() {
  const todosLosBotones = document.querySelectorAll('button');
  todosLosBotones.forEach(btn => btn.addEventListener('click', reproducirSonidoBoton));

  btnMuteBgm.addEventListener('click', toggleMuteBgMusic);

  // Botones Locales
  btnStart.addEventListener('click', iniciarJuego);
  btnPause.addEventListener('click', () => pararJuego(true));

  btnSpeed.addEventListener('click', () => {
    velocidadIdx = (velocidadIdx + 1) % VELOCIDADES.length;
    speedText.textContent = VELOCIDADES[velocidadIdx].texto;
    if (jugando) {
      if (intervalo) clearInterval(intervalo);
      intervalo = setInterval(extraerNumero, VELOCIDADES[velocidadIdx].ms);
    }
  });

  btnRecount.addEventListener('click', ejecutarRecuento);

  btnL1.addEventListener('click', () => seleccionarLinea('L1'));
  btnL2.addEventListener('click', () => seleccionarLinea('L2'));
  btnL3.addEventListener('click', () => seleccionarLinea('L3'));

  btnReset.addEventListener('click', () => modalReset.classList.remove('hidden'));
  btnConfirmYes.addEventListener('click', () => {
    modalReset.classList.add('hidden');
    if (isRemoteController) {
      enviarComando('CONFIRM_RESET');
    } else {
      resetearJuego();
    }
  });
  btnConfirmNo.addEventListener('click', () => modalReset.classList.add('hidden'));

  if (btnBingo) {
    btnBingo.addEventListener('click', () => {
      if (sorteados.length < MINIMO_NUMEROS_BINGO) return;
      pararJuego(false);
      cantarTexto("¡BINGO! Felicidades al ganador");
      if (bingoOverlay) bingoOverlay.classList.remove('hidden');
    });
  }

  if (bingoOverlay) {
    bingoOverlay.addEventListener('click', () => bingoOverlay.classList.add('hidden'));
  }

  // Navegación de Menú
  btnMenuPlay.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    headerTitle.classList.add('hidden');
    gameView.classList.remove('hidden');
  });

  btnMenuRemote.addEventListener('click', () => {
    connectError.classList.add('hidden');
    inputRoomCode.value = '';
    modalConnectRemote.classList.remove('hidden');
  });

  btnSubmitConnect.addEventListener('click', () => {
    const val = inputRoomCode.value.trim();
    if (val.length === 4) {
      conectarControlRemoto(val);
    } else {
      connectError.classList.remove('hidden');
    }
  });

  btnCancelConnect.addEventListener('click', () => {
    modalConnectRemote.classList.add('hidden');
  });

  btnHome.addEventListener('click', () => {
    pararJuego(false);
    gameView.classList.add('hidden');
    remoteControlView.classList.add('hidden');
    headerTitle.classList.remove('hidden');
    mainMenu.classList.remove('hidden');
  });

  btnMenuRules.addEventListener('click', () => modalRules.classList.remove('hidden'));
  btnCloseRules.addEventListener('click', () => modalRules.classList.add('hidden'));

  // Eventos de Botones del Control Remoto (Celular)
  remoteBtnStart.addEventListener('click', () => enviarComando('START'));
  remoteBtnPause.addEventListener('click', () => enviarComando('PAUSE'));
  remoteBtnSpeed.addEventListener('click', () => enviarComando('SPEED'));
  remoteBtnRecount.addEventListener('click', () => enviarComando('RECOUNT'));
  remoteBtnL1.addEventListener('click', () => enviarComando('L1'));
  remoteBtnL2.addEventListener('click', () => enviarComando('L2'));
  remoteBtnL3.addEventListener('click', () => enviarComando('L3'));
  remoteBtnReset.addEventListener('click', () => {
    if (isRemoteController) {
      modalReset.classList.remove('hidden');
    } else {
      enviarComando('RESET');
    }
  });
  remoteBtnBingo.addEventListener('click', () => enviarComando('BINGO'));

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      if (jugando) {
        pararJuego(true);
      } else {
        iniciarJuego();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);