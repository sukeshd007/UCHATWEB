/* src/components/layout/AppLayout.module.css */

.layout {
  display: grid;
  min-height: 100dvh;
  max-width: 1280px;
  margin: 0 auto;
  
  /* Desktop: sidebar + content */
  grid-template-areas:
    "topnav topnav"
    "sidenav main"
    "sidenav main";
  grid-template-columns: 240px 1fr;
  grid-template-rows: 60px 1fr;
}

.main {
  grid-area: main;
  min-height: calc(100dvh - 60px);
  overflow-y: auto;
  overflow-x: hidden;
}

.fullscreen {
  grid-template-areas: "main";
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.fullscreen .main {
  grid-area: main;
  min-height: 100dvh;
}

/* Tablet */
@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 72px 1fr;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .layout {
    grid-template-areas:
      "topnav"
      "main"
      "bottomnav";
    grid-template-columns: 1fr;
    grid-template-rows: 56px 1fr 60px;
  }
  
  .main {
    min-height: calc(100dvh - 116px);
    padding-bottom: 0;
  }
}
