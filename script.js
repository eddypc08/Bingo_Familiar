// === CONFIGURA AQUÍ EL NOMBRE DE TU ARCHIVO DE MÚSICA DE FONDO ===
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

// Audio de Fondo
let bgMusic = null;
let bgMuted = false;

// Elementos del DOM
const mainMenu = document.getElementById('main-menu');
const gameView = document.getElementById('game-view');
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

const btnMuteBgm = document.getElementById('btn-mute-bgm');
const iconSoundOn = document.getElementById('icon-sound-on');
const iconSoundOff = document.getElementById('icon-sound-off');

const modalReset = document.getElementById('modal-overlay');
const btnConfirmYes = document.getElementById('btn-confirm-yes');
const btnConfirmNo = document.getElementById('btn-confirm-no');

const modalRules = document.getElementById('modal-rules');
const btnMenuPlay = document.getElementById('btn-menu-play');
const btnMenuRules = document.getElementById('btn-menu-rules');
const btnCloseRules = document.getElementById('btn-close-rules');
const bingoOverlay = document.getElementById('bingo-overlay');

// Inicialización
function init() {
  crearTablero();
  resetearJuego();
  inicializarMusicaFondo();
  configurarEventos();
}

// Inicializar Audio de Fondo
function inicializarMusicaFondo() {
  bgMusic = new Audio(RUTA_MUSICA_FONDO);
  bgMusic.loop = true;
  bgMusic.volume = 0.1;
}

// Reproducir sonido de clic para botones
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

// Alternar Silencio de la Música de Fondo
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

// Crear celdas del tablero (1 al 90)
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

// Resetear variables y vista
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

// Sacar un número aleatorio
function extraerNumero() {
  if (!jugando) return;

  if (disponibles.length === 0) {
    pararJuego(false);
    cantarTexto("¡Fin del juego! Salieron todos los numeros.");
    return;
  }

  const idxAleatorio = Math.floor(Math.random() * disponibles.length);
  const num = disponibles.splice(idxAleatorio, 1)[0];
  sorteados.push(num);

  mostrarNumero(num);
  cantarTexto(`${num}`);
  actualizarEstadoBingo();
}

// Mostrar número extraído en el tablero e historial
function mostrarNumero(num) {
  numberDisplay.textContent = num;

  const cell = document.getElementById(`cell-${num}`);
  if (cell) cell.classList.add('active');

  actualizarHistorial();
}

// Actualizar últimas balotas en pantalla
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

// Habilitar o deshabilitar botón BINGO (Mínimo 15 números)
function actualizarEstadoBingo() {
  if (!btnBingo) return;

  if (sorteados.length >= MINIMO_NUMEROS_BINGO) {
    btnBingo.disabled = false;
    btnBingo.classList.remove('disabled');
    btnBingo.title = "¡Presiona si hay ganador!";
  } else {
    btnBingo.disabled = true;
    btnBingo.classList.add('disabled');
    btnBingo.title = `Faltan ${MINIMO_NUMEROS_BINGO - sorteados.length} números para activar BINGO`;
  }
}

// Iniciar/Reanudar extracción
function iniciarJuego() {
  if (jugando || enRecuento) return;

  limpiarTemporizadores();

  if (bgMusic && bgMusic.paused) {
    bgMusic.play().catch(() => {});
  }

  const esInicioNuevo = sorteados.length === 0;
  jugando = true;
  startText.textContent = 'Jugando...';

  if (esInicioNuevo) {
    const mensajeInicio = "Prepárense familia, el juego empieza en 3, 2, 1... ¡A jugar!";
    cantarTexto(mensajeInicio);
    
    const tiempoEspera = Math.max(6500, mensajeInicio.length * 100);

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

// Limpiar temporizadores
function limpiarTemporizadores() {
  if (intervalo) {
    clearInterval(intervalo);
    intervalo = null;
  }
  if (timeoutInicio) {
    clearTimeout(timeoutInicio);
    timeoutInicio = null;
  }
}

// Parar extracción de forma inmediata
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

// RECUENTO: De menor a mayor
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

// Selección de Líneas (L1, L2, L3)
function seleccionarLinea(linea) {
  if (lineaSeleccionada === linea) {
    desactivarLinea();
    return;
  }

  lineaSeleccionada = linea;
  
  [btnL1, btnL2, btnL3].forEach(btn => btn.classList.remove('active'));
  ticketStrikeLine.classList.remove('hidden', 'line-1', 'line-2', 'line-3');

  if (linea === 'L1') {
    btnL1.classList.add('active');
    ticketStrikeLine.classList.add('line-1');
  } else if (linea === 'L2') {
    btnL2.classList.add('active');
    ticketStrikeLine.classList.add('line-2');
  } else if (linea === 'L3') {
    btnL3.classList.add('active');
    ticketStrikeLine.classList.add('line-3');
  }
}

function desactivarLinea() {
  lineaSeleccionada = null;
  [btnL1, btnL2, btnL3].forEach(btn => btn.classList.remove('active'));
  ticketStrikeLine.classList.add('hidden');
  ticketStrikeLine.classList.remove('line-1', 'line-2', 'line-3');
}

// Síntesis de voz
function cantarTexto(texto) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }
}

// Configuración de botones y eventos
function configurarEventos() {
  const todosLosBotones = document.querySelectorAll('button');
  todosLosBotones.forEach(btn => {
    btn.addEventListener('click', reproducirSonidoBoton);
  });

  btnMuteBgm.addEventListener('click', toggleMuteBgMusic);

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

  // Botones L1, L2, L3
  btnL1.addEventListener('click', () => seleccionarLinea('L1'));
  btnL2.addEventListener('click', () => seleccionarLinea('L2'));
  btnL3.addEventListener('click', () => seleccionarLinea('L3'));

  btnReset.addEventListener('click', () => {
    modalReset.classList.remove('hidden');
  });

  btnConfirmYes.addEventListener('click', () => {
    modalReset.classList.add('hidden');
    resetearJuego();
  });

  btnConfirmNo.addEventListener('click', () => {
    modalReset.classList.add('hidden');
  });

  // Eventos para Botón BINGO
  if (btnBingo) {
    btnBingo.addEventListener('click', () => {
      if (sorteados.length < MINIMO_NUMEROS_BINGO) return;
      pararJuego(false);
      cantarTexto("¡BINGO! Felicidades al ganador");
      if (bingoOverlay) bingoOverlay.classList.remove('hidden');
    });
  }

  if (bingoOverlay) {
    bingoOverlay.addEventListener('click', () => {
      bingoOverlay.classList.add('hidden');
    });
  }

  // Navegación Menú - Juego
  btnMenuPlay.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    gameView.classList.remove('hidden');
  });

  btnHome.addEventListener('click', () => {
    pararJuego(false);
    gameView.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });

  btnMenuRules.addEventListener('click', () => {
    modalRules.classList.remove('hidden');
  });

  btnCloseRules.addEventListener('click', () => {
    modalRules.classList.add('hidden');
  });

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

// Cargar al iniciar
document.addEventListener('DOMContentLoaded', init);