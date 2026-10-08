"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // Actualiza el año en todas las páginas.
  const anio = document.getElementById("anio");

  if (anio) {
    anio.textContent = new Date().getFullYear();
  }

  // Solo ejecuta el carrusel en las páginas que lo incluyen.
  const carrusel = document.querySelector(".carrusel-marcas");

  if (!carrusel) {
    return;
  }

  const diapositivas = Array.from(
    carrusel.querySelectorAll(".diapositiva")
  );

  const anterior = carrusel.querySelector("#anterior");
  const siguiente = carrusel.querySelector("#siguiente");
  const pausa = carrusel.querySelector("#pausa");
  const contador = carrusel.querySelector("#contador");

  const indicadores = Array.from(
    carrusel.querySelectorAll("[data-slide]")
  );

  if (
    diapositivas.length === 0 ||
    !anterior ||
    !siguiente ||
    !pausa ||
    !contador
  ) {
    return;
  }

  const preferenciaMovimiento = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  // Cambia de imagen cada cuatro segundos.
  const intervalo = 4000;

  let actual = 0;
  let temporizador = null;
  let pausado = preferenciaMovimiento.matches;

  /*
    El CSS necesita que las diapositivas estén presentes
    para realizar la transición de opacidad.
    Por eso quitamos hidden y controlamos su visibilidad
    mediante la clase is-active.
  */
  diapositivas.forEach((diapositiva, indice) => {
    diapositiva.hidden = false;

    diapositiva.classList.toggle(
      "is-active",
      indice === actual
    );

    diapositiva.setAttribute(
      "aria-hidden",
      String(indice !== actual)
    );
  });

  carrusel.classList.add("preparado");

  const variasImagenes = diapositivas.length > 1;

  anterior.disabled = !variasImagenes;
  siguiente.disabled = !variasImagenes;
  pausa.disabled = !variasImagenes;

  indicadores.forEach((boton) => {
    boton.disabled = !variasImagenes;
  });

  function mostrar(posicion, manual = false) {
    actual =
      (posicion + diapositivas.length) %
      diapositivas.length;

    diapositivas.forEach((diapositiva, indice) => {
      const activa = indice === actual;

      diapositiva.classList.toggle(
        "is-active",
        activa
      );

      diapositiva.setAttribute(
        "aria-hidden",
        String(!activa)
      );
    });

    indicadores.forEach((boton) => {
      const activa = Number(boton.dataset.slide) === actual;

      boton.setAttribute(
        "aria-pressed",
        String(activa)
      );
    });

    contador.setAttribute(
      "aria-live",
      manual ? "polite" : "off"
    );

    const numero = String(actual + 1).padStart(2, "0");
    const total = String(
      diapositivas.length
    ).padStart(2, "0");

    contador.textContent = `${numero} / ${total}`;
  }

  function detener() {
    window.clearInterval(temporizador);
    temporizador = null;
  }

  function iniciar() {
    detener();

    if (
      pausado ||
      document.hidden ||
      !variasImagenes
    ) {
      return;
    }

    temporizador = window.setInterval(() => {
      mostrar(actual + 1);
    }, intervalo);
  }

  function actualizarPausa() {
    pausa.textContent = pausado ? "Reanudar" : "Pausar";

    pausa.setAttribute(
      "aria-label",
      pausado
        ? "Reanudar el cambio automático de marcas"
        : "Pausar el cambio automático de marcas"
    );
  }

  anterior.addEventListener("click", () => {
    mostrar(actual - 1, true);
    iniciar();
  });

  siguiente.addEventListener("click", () => {
    mostrar(actual + 1, true);
    iniciar();
  });

  indicadores.forEach((boton) => {
    boton.addEventListener("click", () => {
      mostrar(Number(boton.dataset.slide), true);
      iniciar();
    });
  });

  pausa.addEventListener("click", () => {
    pausado = !pausado;
    actualizarPausa();
    iniciar();
  });

  /*
    Cuando una persona usa el teclado para entrar en los
    controles, detenemos la rotación para que pueda navegar
    sin cambios inesperados. Puede pulsar Reanudar después.
  */
  carrusel.addEventListener("focusin", (evento) => {
    if (evento.target.matches(":focus-visible")) {
      pausado = true;
      actualizarPausa();
      detener();
    }
  });

  // Detiene la rotación cuando la pestaña está oculta.
  document.addEventListener("visibilitychange", iniciar);

  // Respeta la preferencia de reducir movimiento.
  preferenciaMovimiento.addEventListener("change", (evento) => {
    pausado = evento.matches;
    actualizarPausa();
    iniciar();
  });

  mostrar(0);
  actualizarPausa();
  iniciar();

});