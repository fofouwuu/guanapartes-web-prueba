
"use strict";

// ==========================================
// CONFIGURACIÓN DE LA API DE GUANAPARTES
// ==========================================

// Sustituye esta dirección por la URL pública
// de la NUEVA API publicada en Railway.
// No agregues /api/productos ni una barra al final.
const API_BASE_URL = "https://guanapartes-api-prueba-production-4858.up.railway.app";

document.addEventListener("DOMContentLoaded", () => {
  const lista = document.getElementById("catalogo-lista");

  // Este archivo solo actúa en la página del catálogo.
  if (!lista) return;

  const formulario = document.getElementById("catalogo-filtros");
  const buscador = document.getElementById("catalogo-buscar");
  const selectorMarca = document.getElementById("catalogo-marca");
  const limpiar = document.getElementById("catalogo-limpiar");
  const estado = document.getElementById("catalogo-estado");
  const avisoMarcas = document.getElementById("catalogo-aviso-marcas");
  const anterior = document.getElementById("catalogo-anterior");
  const siguiente = document.getElementById("catalogo-siguiente");
  const indicadorPagina = document.getElementById("catalogo-pagina");
  const reintentar = document.getElementById("catalogo-reintentar");

  const formatoPrecio = new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const formatoNumero = new Intl.NumberFormat("es-CR");

  let paginaActual = 1;
  let totalPaginas = 0;
  let busquedaActual = "";
  let marcaActual = "";
  let cargando = false;
  let numeroSolicitud = 0;
  let controlador = null;

  // ==========================================
  // FUNCIONES AUXILIARES
  // ==========================================

  // Crea elementos sin interpretar datos como HTML.
  function crearElemento(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);

    if (clase) elemento.className = clase;

    if (texto !== undefined) {
      elemento.textContent = texto;
    }

    return elemento;
  }

  function añadirDato(listaDatos, nombre, valor) {
    listaDatos.append(
      crearElemento("dt", "", nombre),
      crearElemento("dd", "", valor)
    );
  }

  // ==========================================
  // TARJETAS DE PRODUCTOS
  // ==========================================

  function crearTarjeta(producto) {
    const tarjeta = crearElemento("article", "tarjeta-producto");
    const contenido = crearElemento("div", "contenido-producto");

    const descripcion =
      producto.descripcion || "Repuesto sin descripción";

    const marca =
      producto.marca || "Marca no especificada";

    const numeroParte =
      producto.numeroParte || "No registrado";

    const titulo = crearElemento("h3", "", descripcion);
    titulo.id = `producto-${producto.id}`;

    tarjeta.setAttribute("aria-labelledby", titulo.id);

    const datos = crearElemento("dl", "datos-producto");

    añadirDato(datos, "Identificador", String(producto.id));
    añadirDato(datos, "Número de parte", numeroParte);
    añadirDato(datos, "Marca", marca);

    const precio = producto.precioPublico;

    añadirDato(
      datos,
      "Precio de referencia",
      typeof precio === "number" &&
      Number.isFinite(precio) &&
      precio > 0
        ? formatoPrecio.format(precio)
        : "Consultar precio"
    );

    let disponibilidad = "Consultar disponibilidad";

    if (
      typeof producto.cantidad === "number" &&
      Number.isFinite(producto.cantidad)
    ) {
      disponibilidad = producto.cantidad > 0
        ? `${formatoNumero.format(producto.cantidad)} unidades registradas`
        : "Sin existencias registradas";
    }

    añadirDato(datos, "Disponibilidad", disponibilidad);

    const nota = crearElemento(
      "p",
      "nota-producto",
      "Confirma el precio final, la disponibilidad y la compatibilidad con tu equipo."
    );

    // Mensaje para WhatsApp.
    const mensaje = [
      "Hola, quisiera consultar por este repuesto de Guanapartes:",
      `Identificador: ${producto.id}`,
      `Descripción: ${descripcion}`,
      `Marca: ${marca}`,
      `Número de parte: ${numeroParte}`,
      "¿Me confirman disponibilidad, precio final y compatibilidad?"
    ].join("\n");

    const enlace = crearElemento(
      "a",
      "boton",
      "Consultar por WhatsApp"
    );

    enlace.href =
      `https://wa.me/50621014422?text=${encodeURIComponent(mensaje)}`;

    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";

    enlace.setAttribute(
      "aria-label",
      `Consultar por WhatsApp sobre ${descripcion}, artículo ${producto.id}`
    );

    contenido.append(
      crearElemento("p", "marca-producto", marca),
      titulo,
      datos,
      nota,
      enlace
    );

    tarjeta.append(contenido);

    return tarjeta;
  }

  // ==========================================
  // PAGINACIÓN
  // ==========================================

  function actualizarBotones() {
    anterior.disabled =
      cargando || totalPaginas === 0 || paginaActual <= 1;

    siguiente.disabled =
      cargando || totalPaginas === 0 ||
      paginaActual >= totalPaginas;
  }

  // ==========================================
  // CARGAR PRODUCTOS DESDE RAILWAY
  // ==========================================

  async function cargarProductos(pagina = 1) {
    // Cancela consultas anteriores.
    if (controlador) controlador.abort();

    controlador = new AbortController();

    const solicitudActual = ++numeroSolicitud;

    cargando = true;
    actualizarBotones();

    lista.setAttribute("aria-busy", "true");
    lista.replaceChildren();

    estado.textContent = "Cargando productos…";
    indicadorPagina.textContent = "Cargando…";
    reintentar.hidden = true;

    const parametros = new URLSearchParams({
      pagina: String(pagina),
      buscar: busquedaActual,
      marca: marcaActual
    });

    try {
      // NUEVO: consulta la API publicada en Railway.
      const respuesta = await fetch(
        `${API_BASE_URL}/api/productos?${parametros}`,
        {
          signal: controlador.signal,
          cache: "no-store"
        }
      );

      if (!respuesta.ok) {
        throw new Error(
          `La API respondió con estado ${respuesta.status}.`
        );
      }

      const datos = await respuesta.json();

      if (!Array.isArray(datos.productos)) {
        throw new Error(
          "La API no devolvió una lista de productos."
        );
      }

      // Ignora respuestas de solicitudes anteriores.
      if (solicitudActual !== numeroSolicitud) return;

      paginaActual = datos.pagina;
      totalPaginas = datos.totalPaginas;

      if (datos.totalProductos === 0) {
        estado.textContent =
          "No se encontraron productos. Prueba otra descripción, número de parte o marca.";

        indicadorPagina.textContent = "Sin resultados";
        return;
      }

      const tarjetas = document.createDocumentFragment();

      datos.productos.forEach((producto) => {
        tarjetas.append(crearTarjeta(producto));
      });

      lista.replaceChildren(tarjetas);

      const desde =
        (datos.pagina - 1) * datos.porPagina + 1;

      const hasta =
        desde + datos.productos.length - 1;

      estado.textContent =
        `Mostrando ${formatoNumero.format(desde)}–` +
        `${formatoNumero.format(hasta)} de ` +
        `${formatoNumero.format(datos.totalProductos)} productos.`;

      indicadorPagina.textContent =
        `Página ${formatoNumero.format(paginaActual)} de ` +
        formatoNumero.format(totalPaginas);

    } catch (error) {
      if (error.name === "AbortError") return;
      if (solicitudActual !== numeroSolicitud) return;

      totalPaginas = 0;

      estado.textContent =
        "No se pudo cargar el catálogo. Comprueba tu conexión e inténtalo de nuevo.";

      indicadorPagina.textContent =
        "Catálogo no disponible";

      reintentar.hidden = false;

      console.error(
        "Error al cargar productos desde Railway:",
        error
      );

    } finally {
      if (solicitudActual === numeroSolicitud) {
        cargando = false;

        lista.setAttribute("aria-busy", "false");

        actualizarBotones();
      }
    }
  }

  // ==========================================
  // CARGAR MARCAS DESDE RAILWAY
  // ==========================================

  async function cargarMarcas() {
    try {
      // NUEVO: consulta las marcas desde Railway.
      const respuesta = await fetch(
        `${API_BASE_URL}/api/marcas`,
        {
          cache: "no-store"
        }
      );

      if (!respuesta.ok) {
        throw new Error(
          `La API respondió con estado ${respuesta.status}.`
        );
      }

      const marcas = await respuesta.json();

      if (!Array.isArray(marcas)) {
        throw new Error(
          "La API no devolvió una lista de marcas."
        );
      }

      marcas.forEach((marca) => {
        const opcion = document.createElement("option");

        opcion.value = marca;
        opcion.textContent = marca;

        selectorMarca.append(opcion);
      });

      selectorMarca.disabled = false;
      avisoMarcas.textContent = "";

    } catch (error) {
      avisoMarcas.textContent =
        "No se pudieron cargar las marcas. Puedes utilizar el buscador; recarga la página para volver a intentarlo.";

      console.error(
        "Error al cargar marcas desde Railway:",
        error
      );
    }
  }

  // ==========================================
  // FILTROS DEL CATÁLOGO
  // ==========================================

  function aplicarFiltros() {
    busquedaActual = buscador.value.trim();
    marcaActual = selectorMarca.value;

    cargarProductos(1);
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    aplicarFiltros();
  });

  selectorMarca.addEventListener("change", aplicarFiltros);

  limpiar.addEventListener("click", () => {
    buscador.value = "";
    selectorMarca.value = "";

    aplicarFiltros();
  });

  // ==========================================
  // BOTONES DE PAGINACIÓN
  // ==========================================

  anterior.addEventListener("click", () => {
    if (!cargando && paginaActual > 1) {
      cargarProductos(paginaActual - 1);
    }
  });

  siguiente.addEventListener("click", () => {
    if (!cargando && paginaActual < totalPaginas) {
      cargarProductos(paginaActual + 1);
    }
  });

  reintentar.addEventListener("click", () => {
    cargarProductos(paginaActual);
  });

  // ==========================================
  // INICIALIZAR EL CATÁLOGO
  // ==========================================

  cargarMarcas();
  cargarProductos(1);
});
