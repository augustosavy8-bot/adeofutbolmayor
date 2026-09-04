'use client';

/**
 * Un .bat que abre Chrome en modo "imprimí y no preguntes".
 *
 * `--kiosk-printing` manda el ticket a la impresora predeterminada sin abrir
 * el diálogo. Es la única forma de que la impresión por driver del sistema
 * salga sola, y no se puede activar desde la página: es una bandera de arranque
 * del navegador. Por eso se entrega el acceso directo hecho.
 *
 * `--user-data-dir` no es un adorno. Si Chrome ya está abierto, una ventana
 * nueva se engancha al proceso que ya corre y **las banderas se ignoran en
 * silencio**: se abriría igual y seguiría preguntando. Con un perfil propio
 * arranca un proceso aparte y la bandera vale siempre.
 */
export function batKioskPrinting(url: string) {
  return [
    '@echo off',
    'rem Abre el buffet de ADEO en modo impresion directa (sin dialogo).',
    'rem Requisito: la impresora tiene que estar como PREDETERMINADA en Windows.',
    'setlocal',
    `set "URL=${url}"`,
    'set "PERFIL=%LocalAppData%\\AdeoBuffet"',
    'set "NAV="',
    'for %%P in (',
    '  "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"',
    '  "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"',
    '  "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"',
    '  "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"',
    '  "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"',
    ') do if exist %%~P if not defined NAV set "NAV=%%~P"',
    'if not defined NAV (',
    '  echo No se encontro Chrome ni Edge instalado.',
    '  pause',
    '  exit /b 1',
    ')',
    'start "" "%NAV%" --kiosk-printing --user-data-dir="%PERFIL%" --app="%URL%"',
    'endlocal',
    // Termina en salto de línea: cmd puede ignorar una última línea sin cerrar.
    '',
  ].join('\r\n');
}

/** Nombre del archivo, con el puesto para no confundir buffet con entrada. */
export function nombreBat(puesto: string) {
  return `Buffet ADEO - ${puesto} (sin dialogo).bat`;
}
