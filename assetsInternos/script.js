//Este script se cargara en cada html de la documentacion al ejecutarlo

//Iconos sidebar
const iconExpand = `
<svg width="18" height="18" viewBox="0 0 32 32" fill="none">
  <rect x="2" y="2" width="28" height="28" rx="4" fill="#1E88E5"/>
  <rect x="6" y="6" width="20" height="20" rx="3" fill="none" stroke="#64B5F6" stroke-width="2"/>
  <line x1="16" y1="10" x2="16" y2="22" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="10" y1="16" x2="22" y2="16" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

const iconCollapse = `
<svg width="18" height="18" viewBox="0 0 32 32" fill="none">
  <rect x="2" y="2" width="28" height="28" rx="4" fill="#1E88E5"/>
  <rect x="6" y="6" width="20" height="20" rx="3" fill="none" stroke="#64B5F6" stroke-width="2"/>
  <line x1="10" y1="16" x2="22" y2="16" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;


let nombreProyecto


fetch(prefix + "config.json")
  .then(res => res.json())
  .then(data => {
    nombreProyecto = data.project.title
});


//cargar icono

(async () => {
  const exts = ["svg","png","ico","webp","jpg","jpeg"];
  for (const ext of exts) {
    const url = prefix + `assets/icon.${ext}`;
    if ((await fetch(url, { method: "HEAD" })).ok) {
      document.head.insertAdjacentHTML(
        "beforeend",
        `<link rel="icon" href="${url}">`
      );
      break;
    }
  }
})();



//cargar codigo desde archivo (externo o interno)

document.querySelectorAll('pre.fileCode').forEach(async pre => {
    const path = pre.getAttribute("path");

    const contenido = await fetch(path).then(r => r.text());

    const code = document.createElement('code');
    code.textContent = contenido;

    pre.appendChild(code);
    if (pre.hasAttribute("auto")){
      hljs.highlightElement(code)
    }

    createCopyButton(pre)
});




// 2. Cargar sidebar.html
fetch(prefix + "assetsInternos/sidebar.html")
  .then(res => {
    if (!res.ok) throw new Error("No se pudo cargar sidebar.html");
    return res.text();
  })
  .then(html => {
    document.body.insertAdjacentHTML('beforeend', html);
    cargarMenuHamburguesa()

    // ===============================================================
    // 3. Cargar index.json autogenerado por el parser
    // ===============================================================
    return fetch(prefix + "assetsInternos/index.json");
  })
  .then(res => {
    if (!res.ok) throw new Error("No se pudo cargar index.json");
    return res.json();
  })
  .then(indexData => {
    // ===============================================================
    // 4. Construir el menú dinámico usando index.json
    // ===============================================================
    const menu = document.querySelector("#sidebar-menu");
    if (!menu) return;

    // --- ORDENAR: huérfanos arriba, carpetas después ---
    const orphans = indexData.filter(n => n.type === "file");
    const folders = indexData.filter(n => n.type === "folder");

    orphans.sort((a, b) => a.name.localeCompare(b.name));
    folders.sort((a, b) => a.name.localeCompare(b.name));

    const ordered = [...orphans, ...folders];

    // --- Renderizado original ---
  
document.getElementById("sidebar-title").href = prefix;
document.getElementById("sidebar-title").textContent = nombreProyecto;


function renderNode(node, container) {
  if (node.type === "file") {
    const a = document.createElement("a");
    a.href = prefix + "pages/" + node.path;
    a.textContent = node.name;
    a.style.display = "block";
    container.appendChild(a);
    return;
  }

  if (node.type === "folder") {
    const folderId = "folder_" + node.path; // ID único basado en la ruta

    const header = document.createElement("div");
    header.classList.add("folder-header");

    const icon = document.createElement("span");
    icon.classList.add("folder-icon");

    const title = document.createElement("span");
    title.textContent = node.name;
    title.classList.add("folder-title");

    header.appendChild(icon);
    header.appendChild(title);
    container.appendChild(header);

    const sub = document.createElement("div");
    sub.classList.add("folder-content");
    sub.style.marginLeft = "15px";
    container.appendChild(sub);

    // Renderizar hijos
    node.children.forEach(child => renderNode(child, sub));

    // --- APLICAR ESTADO GUARDADO ---
    const savedState = sessionStorage.getItem(folderId);
    const isCollapsed = savedState === "closed" || savedState === null;

    if (isCollapsed) {
      sub.classList.add("collapsed");
      icon.innerHTML = iconExpand;
    } else {
      icon.innerHTML = iconCollapse;
    }


    const tree = document.getElementById("sidebar-menu");

    // Restaurar scroll
    const savedScroll = sessionStorage.getItem("sidebar-menu");
    if (savedScroll !== null) {
        tree.scrollTop = parseInt(savedScroll, 10);
    }

    // Guardar scroll en tiempo real
    tree.addEventListener("scroll", () => {
        sessionStorage.setItem("sidebar-menu", tree.scrollTop);
    });


    // --- EVENTO CLICK ---
    header.addEventListener("click", () => {
      const collapsed = sub.classList.toggle("collapsed");

      if (collapsed) {
        icon.innerHTML = iconExpand;
        sessionStorage.setItem(folderId, "closed");
      } else {
        icon.innerHTML = iconCollapse;
        sessionStorage.setItem(folderId, "open");
      }
    });
  }
}




  // Renderizar todo en orden
  ordered.forEach(node => renderNode(node, menu));
  // ===============================================================
  // 5. Resaltar la página actual
  // ===============================================================
  const currentPath = path.replace(/^\//, "");
  const links = document.querySelectorAll("#sidebar-menu a");
  links.forEach(a => {
    if (a.href.endsWith(currentPath)) {
      a.classList.add("active");
    }
  });
})


//Menu hamburguesa

function cargarMenuHamburguesa(){
  const btn = document.getElementById("icon-btn");
  const btn2 = document.getElementById("icon-btn2");
  const nav = document.getElementById("sidebar");
  const main = document.getElementsByTagName("main")[0]

  // Evento de botones
  btn.addEventListener("click", () => {
    nav.classList.toggle("show");
    btn2.classList.toggle("active");
    main.classList.toggle("sidebarActiva");
  });

  btn2.addEventListener("click", () => {
    nav.classList.toggle("show");
    btn2.classList.toggle("active");
    main.classList.toggle("sidebarActiva");
  });

  // Media query para detectar móvil
  const mq = window.matchMedia("(max-width: 999px)");

  // Función que se ejecuta SOLO cuando se cruza el límite 999px
  function handleChange(e) {
    if (e.matches) {
      // Hemos pasado a móvil
      nav.classList.remove("show");
      btn2.classList.remove("active");
      main.classList.remove("sidebarActiva");
      main.classList.remove("pc");
      
    } else {
      // Hemos pasado a PC
      nav.classList.add("show");
      btn2.classList.add("active");
      main.classList.add("sidebarActiva");
      main.classList.add("pc");
    }
  }

  // Ejecutar al cargar
  handleChange(mq);

  // Ejecutar SOLO cuando se cruza 999px
  mq.addEventListener("change", handleChange);
}


document.querySelectorAll('pre.multiline-code').forEach(pre => {
    if (pre.classList.contains("fileCode")) return;
    createCopyButton(pre);
});



function createCopyButton(father){
    father.insertAdjacentHTML("beforeend", `
          <button class="copy-btn" title="Copy">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
          </button>
    `);

    putCopyButton(father.querySelector(".copy-btn"));
}

function putCopyButton(btn){
  btn.addEventListener('click', async () => {
    btn.classList.add('copied', 'disabled');
    
    const originalHTML = btn.innerHTML;

    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span class="copy-text">Copied</span>
    `;

    try {
        const pre = btn.closest('pre.multiline-code');
        const code = pre.querySelector('code');
        if (!code) throw new Error('No code found');

        await navigator.clipboard.writeText(code.innerText);

        setTimeout(() => {
            btn.classList.remove('copied', 'disabled');
            btn.innerHTML = originalHTML;
        }, 1000);

    } catch (err) {
        console.error('Error al copiar:', err);
        btn.classList.remove('copied', 'disabled');
        btn.innerHTML = originalHTML;
    }
  });
}




const codes = document.querySelectorAll('code[data-auto="true"]');
codes.forEach(el => {
    hljs.highlightElement(el);
});

mediumZoom('img');
const players = Plyr.setup('video');
const aundioPlayers = Plyr.setup('audio');