const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const examCatalog = [
  { id: "hemograma", name: "Hemograma completo", type: "Análises clínicas", covered: true, price: 0, prep: "Sem preparo especial" },
  { id: "glicemia", name: "Glicemia", type: "Análises clínicas", covered: true, price: 0, prep: "Orientação no agendamento" },
  { id: "colesterol", name: "Colesterol total e frações", type: "Análises clínicas", covered: true, price: 0, prep: "Orientação no agendamento" },
  { id: "tsh", name: "TSH", type: "Análises clínicas", covered: true, price: 0, prep: "Sem preparo especial" },
  { id: "ressonancia", name: "Ressonância magnética de joelho", type: "Imagem", covered: false, price: 380, prep: "Chegar 30 minutos antes" },
  { id: "vitamina-d", name: "Vitamina D", type: "Análises clínicas", covered: false, price: 79, prep: "Sem preparo especial" },
  { id: "ferritina", name: "Ferritina", type: "Análises clínicas", covered: true, price: 0, prep: "Sem preparo especial" },
  { id: "ultrassom", name: "Ultrassonografia de abdome total", type: "Imagem", covered: false, price: 240, prep: "Preparo informado após escolha do horário" }
];

const detectedExamIds = ["hemograma", "glicemia", "colesterol", "tsh", "ressonancia"];
const cloneDetectedExams = () => detectedExamIds.map(id => ({ ...examCatalog.find(exam => exam.id === id) }));

const flowSteps = [
  "Pedido médico", "Leitura", "Exames", "Acesso", "Paciente", "Pagamento",
  "Carteirinha", "Cobertura", "Localização", "Atendimento", "Unidade",
  "Agenda", "Carrinho", "Checkout", "Confirmação"
];

const state = {
  route: "home",
  step: 0,
  uploadReady: false,
  uploadName: "pedido-medico.jpg",
  ocrDone: false,
  exams: [],
  editingExam: null,
  loggedIn: false,
  patientType: "self",
  patient: "Bruna Graziele",
  dependent: "Lucas Graziele",
  showDependentForm: false,
  payer: "insurance",
  insurer: "Bradesco Saúde",
  plan: "Rede Nacional",
  cardReady: false,
  cep: "04538-132",
  locationSet: false,
  mode: "unit",
  unit: "Hospital São Luiz Itaim",
  date: "28 set",
  time: "14:00",
  payment: "pix",
  confirmed: false,
  vaccineCart: [],
  menuOpen: false,
  ocrTimer: null,
  cardTimer: null
};

const main = $("#main-content");
const footer = $("#site-footer");

function escapeHTML(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function money(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function patientName() {
  return state.patientType === "dependent" ? state.dependent : state.patient;
}

function hasImaging() {
  return state.exams.some(exam => exam.type === "Imagem");
}

function privateTotal() {
  if (state.payer === "private") return state.exams.reduce((sum, exam) => sum + (exam.price || 89), 0);
  return state.exams.reduce((sum, exam) => sum + (exam.covered ? 0 : exam.price), 0);
}

function coveredCount() {
  return state.payer === "insurance" ? state.exams.filter(exam => exam.covered).length : 0;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 3300);
}

function openModal(title, body, actions = []) {
  const buttons = actions.map(action => `<button class="btn ${action.className || "btn-blue"}" data-action="${action.action}">${action.label}</button>`).join("");
  $("#modal-root").innerHTML = `
    <div class="modal-backdrop" role="presentation" data-action="close-modal">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onclick="event.stopPropagation()">
        <h2 id="modal-title">${title}</h2>
        <p>${body}</p>
        <div class="modal-actions">${buttons || '<button class="btn btn-blue" data-action="close-modal">Entendi</button>'}</div>
      </section>
    </div>`;
  $(".modal button")?.focus();
}

function closeModal() {
  $("#modal-root").innerHTML = "";
}

function setRoute(route, options = {}) {
  state.route = route;
  if (Number.isInteger(options.step)) state.step = options.step;
  state.menuOpen = false;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => main.focus(), 50);
}

function render() {
  $("#primary-nav").classList.toggle("is-open", state.menuOpen);
  $(".menu-toggle").setAttribute("aria-expanded", String(state.menuOpen));
  footer.hidden = state.route === "flow";
  if (state.route === "home") renderHome();
  if (state.route === "flow") renderFlow();
  if (state.route === "vaccines") renderVaccines();
  if (state.route === "appointments") renderAppointments();
}

function renderHome() {
  main.innerHTML = `
    <section class="hero">
      <div class="shell hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">Laboratório e diagnóstico Rede D’Or</span>
          <h1>Cuide da sua saúde onde for melhor para você.</h1>
          <p>Envie seu pedido médico e deixe o LabD’Or organizar seus exames, cobertura e agendamento.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" data-action="start-upload">▱ Tenho um pedido médico</button>
            <button class="btn btn-secondary" data-action="choose-exams">Escolher exames</button>
          </div>
        </div>
        <div class="hero-dora" aria-label="Dora, assistente digital da Rede D’Or">
          <img src="assets/dora.webp" alt="Dora, assistente digital da Rede D’Or">
        </div>
      </div>
    </section>

    <div class="shell search-zone">
      <section class="search-panel" aria-labelledby="search-title">
        <div class="search-heading">
          <div><span class="eyebrow">Comece por aqui</span><h2 id="search-title">Qual exame você procura?</h2></div>
          <p>Laboratório, imagem e procedimentos</p>
        </div>
        <div class="search-row">
          <div class="input-wrap">
            <span class="icon" aria-hidden="true">⌕</span>
            <input class="input with-icon" id="home-search" autocomplete="off" placeholder="Digite o nome do exame" aria-label="Pesquisar exame">
            <div class="search-suggestions" id="home-suggestions"></div>
          </div>
          <button class="btn btn-blue" data-action="search-exam">Buscar</button>
        </div>
        <div class="category-grid">
          <button class="category-tile" data-action="choose-exams"><span class="category-icon">✚</span><span><strong>Exames</strong><span>laboratório e imagem</span></span></button>
          <button class="category-tile" data-action="go-vaccines"><span class="category-icon">✦</span><span><strong>Vacinas</strong><span>agendamento separado</span></span></button>
          <button class="category-tile" data-action="scroll-home" data-target="checkups"><span class="category-icon">✓</span><span><strong>Check-ups</strong><span>cuidado preventivo</span></span></button>
        </div>
      </section>
    </div>

    <section class="section" id="checkups">
      <div class="shell">
        <div class="section-heading"><span class="eyebrow">Cuidado preventivo</span><h2>Check-ups pensados para cada momento</h2><p class="lede">Pacotes demonstrativos para facilitar a escolha. A indicação ideal deve ser confirmada com seu médico.</p></div>
        <div class="cards">
          ${checkupCard("Essencial", "Uma visão inicial da sua saúde", "12 exames", 289)}
          ${checkupCard("Coração em dia", "Indicadores para o cuidado cardiovascular", "16 exames", 459)}
          ${checkupCard("Saúde da mulher", "Cuidado integral e preventivo", "18 exames", 529)}
        </div>
      </div>
    </section>

    <section class="section section-soft">
      <div class="shell">
        <div class="section-heading"><span class="eyebrow">Do seu jeito</span><h2>Em casa ou em uma unidade</h2><p class="lede">O LabD’Or orienta a melhor opção de acordo com os exames do pedido e a disponibilidade simulada.</p></div>
        <div class="mode-grid">
          <article class="mode-card"><span class="chip">Sem taxa</span><h3>Coleta em casa</h3><p>Conforto para exames laboratoriais elegíveis, com profissional identificado e acompanhamento do agendamento.</p><button class="btn btn-secondary" data-action="start-lab-only">Simular coleta em casa</button></article>
          <article class="mode-card light"><span class="chip">Rede D’Or</span><h3>Atendimento em unidade</h3><p>Faça exames laboratoriais e de imagem em uma única ida, em unidades compatíveis com o pedido.</p><button class="btn btn-blue" data-action="start-upload">Enviar pedido médico</button></article>
        </div>
      </div>
    </section>

    <section class="section" id="how-it-works">
      <div class="shell">
        <div class="section-heading"><span class="eyebrow">Como funciona</span><h2>Do pedido ao agendamento, sem complicação</h2></div>
        <div class="steps-home">
          <article class="step-home"><span class="step-number">1</span><h3>Envie ou escolha</h3><p>O Smart OCR identifica os exames para você conferir e editar.</p></article>
          <article class="step-home"><span class="step-number">2</span><h3>Confira a cobertura</h3><p>Veja convênio e particular no mesmo carrinho, item a item.</p></article>
          <article class="step-home"><span class="step-number">3</span><h3>Agende do seu jeito</h3><p>Escolha casa ou unidade e horários adequados ao preparo.</p></article>
        </div>
      </div>
    </section>

    <section class="section section-soft" id="units">
      <div class="shell">
        <div class="section-heading"><span class="eyebrow">Perto de você</span><h2>Unidades que combinam com sua rotina</h2><p class="lede">Nomes reais da rede usados para demonstração. Horários, serviços, distância e disponibilidade são simulados.</p></div>
        <div class="unit-preview-grid">
          ${unitPreview("Hospital São Luiz Itaim", "Itaim Bibi, São Paulo", "1,8 km")}
          ${unitPreview("Hospital São Luiz Anália Franco", "Tatuapé, São Paulo", "7,2 km")}
          ${unitPreview("Hospital Vila Nova Star", "Vila Nova Conceição, São Paulo", "3,4 km")}
          ${unitPreview("Hospital São Luiz Morumbi", "Morumbi, São Paulo", "8,6 km")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        <div class="section-heading"><span class="eyebrow">Confiança em cada etapa</span><h2>Mais clareza para cuidar de você</h2></div>
        <div class="trust-row">
          <div class="trust-item"><strong>Jornada protegida</strong><span>Privacidade e segurança desde o pedido.</span></div>
          <div class="trust-item"><strong>Cobertura transparente</strong><span>Resultado item a item antes de agendar.</span></div>
          <div class="trust-item"><strong>Preparo orientado</strong><span>Instruções claras para cada exame.</span></div>
          <div class="trust-item"><strong>Autonomia</strong><span>Reagende ou cancele quando precisar.</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="shell cta-panel"><div><span class="eyebrow">Vamos começar?</span><h2>Seu cuidado pode ser mais simples.</h2><p>Envie seu pedido médico e confira as opções disponíveis.</p></div><button class="btn btn-primary" data-action="start-upload">Tenho um pedido médico</button></div>
    </section>`;
}

function checkupCard(title, description, count, price) {
  return `<article class="card card-interactive"><span class="chip">Pacote demonstrativo</span><h3>${title}</h3><p>${description}</p><div class="card-price">${money(price)} <small>particular</small></div><p>${count} · resultado digital</p><button class="btn btn-ghost btn-block" data-action="select-checkup" data-checkup="${title}">Ver pacote</button></article>`;
}

function unitPreview(name, place, distance) {
  return `<article class="card unit-card"><div class="unit-art">⌖</div><div><span class="chip chip-neutral">${distance}</span><h3>${name}</h3><p>${place}</p><button class="link-button" style="color:var(--blue);font-weight:800" data-action="start-upload">Ver horários simulados →</button></div></article>`;
}

function renderFlow() {
  const progress = Math.min(100, Math.max(4, ((state.step + 1) / flowSteps.length) * 100));
  main.innerHTML = `
    <section class="flow-page">
      <div class="flow-shell">
        <div class="flow-top">
          <div><strong>Etapa ${Math.min(state.step + 1, flowSteps.length)} de ${flowSteps.length}</strong><p>${flowSteps[Math.min(state.step, flowSteps.length - 1)]}</p></div>
          <div class="progress-track" aria-label="Progresso da jornada"><div class="progress-bar" style="width:${progress}%"></div></div>
          <button class="link-button" style="color:var(--blue);font-weight:800" data-action="go-home">Sair</button>
        </div>
        <div class="flow-layout">
          <section class="flow-card">${renderStep()}</section>
          ${renderSummary()}
        </div>
      </div>
    </section>`;
  if (state.step === 1 && !state.ocrDone && !state.ocrTimer) {
    state.ocrTimer = setTimeout(() => {
      state.ocrDone = true;
      state.ocrTimer = null;
      state.step = 2;
      render();
      showToast("5 exames identificados. Confira antes de continuar.");
    }, 1800);
  }
  if (state.step === 6 && !state.cardReady && !state.cardTimer) {
    state.cardTimer = setTimeout(() => {
      state.cardReady = true;
      state.cardTimer = null;
      render();
    }, 1500);
  }
}

function renderStep() {
  switch (state.step) {
    case 0: return uploadStep();
    case 1: return ocrStep();
    case 2: return examsStep();
    case 3: return authStep();
    case 4: return patientStep();
    case 5: return payerStep();
    case 6: return cardStep();
    case 7: return eligibilityStep();
    case 8: return locationStep();
    case 9: return modalityStep();
    case 10: return unitStep();
    case 11: return scheduleStep();
    case 12: return cartStep();
    case 13: return checkoutStep();
    case 14: return confirmationStep();
    default: return uploadStep();
  }
}

function renderSummary() {
  if (state.step === 0 || state.step === 1) {
    return `<aside class="flow-summary"><h3>Você está no controle</h3><p style="font-size:.8rem;color:var(--muted)">Revise, edite ou remova qualquer exame identificado antes de continuar.</p><div class="info-banner"><span>◉</span><div><strong>Protótipo seguro</strong><p>Nenhum arquivo é enviado ou armazenado.</p></div></div></aside>`;
  }
  return `<aside class="flow-summary" aria-label="Resumo do agendamento"><h3>Resumo</h3><ul class="summary-list">
    <li><span>Exames</span><strong>${state.exams.length || "—"}</strong></li>
    <li><span>Paciente</span><strong>${state.step >= 4 ? escapeHTML(patientName()) : "A definir"}</strong></li>
    <li><span>Pagamento</span><strong>${state.step >= 5 ? (state.payer === "insurance" ? state.insurer : "Particular") : "A definir"}</strong></li>
    <li><span>Modalidade</span><strong>${state.step >= 9 ? (state.mode === "home" ? "Em casa" : "Na unidade") : "A definir"}</strong></li>
    <li><span>Total particular</span><strong>${money(privateTotal())}</strong></li>
  </ul>${state.payer === "insurance" && coveredCount() ? `<p style="margin:14px 0 0;font-size:.75rem;color:var(--success)">${coveredCount()} itens cobertos pelo convênio</p>` : ""}</aside>`;
}

function uploadStep() {
  return `<span class="eyebrow">Smart OCR</span><h1>Envie seu pedido médico</h1><p>Use uma foto nítida ou selecione um arquivo. Você poderá conferir tudo antes de continuar.</p>
    <div class="drop-zone">
      ${state.uploadReady ? `<div class="file-ready"><div class="drop-icon" style="width:52px;height:52px;margin:0">✓</div><div><strong>${escapeHTML(state.uploadName)}</strong><span>Imagem pronta para leitura</span></div></div>` : `<div><div class="drop-icon">▱</div><h3>Arraste o arquivo ou escolha uma opção</h3><p>JPG, PNG ou PDF · até 10 MB</p><div class="upload-options"><button class="btn btn-blue btn-small" data-action="simulate-upload">Escolher arquivo</button><button class="btn btn-ghost btn-small" data-action="simulate-camera">Usar câmera</button></div></div>`}
    </div>
    <div class="info-banner"><span>◆</span><div><strong>Leitura inteligente</strong><p>O Smart OCR identifica os exames e prepara uma lista para sua conferência.</p></div></div>
    <div class="flow-actions"><button class="btn btn-ghost" data-action="go-home">Voltar</button><button class="btn btn-primary" data-action="flow-next">Ler pedido</button></div>`;
}

function ocrStep() {
  return `<div class="loading-stage"><div><div class="scanner" aria-hidden="true"></div><span class="eyebrow">Smart OCR em ação</span><h1>Estamos lendo seu pedido</h1><p>Identificando nomes, tipos e preparos. Isso leva só alguns segundos.</p><div class="skeleton-row"></div><div class="skeleton-row" style="width:82%"></div><div class="skeleton-row" style="width:68%"></div></div></div>`;
}

function examsStep() {
  const rows = state.exams.length ? state.exams.map(exam => `
    <article class="exam-row">
      <div>${state.editingExam === exam.id ? `<input class="input" id="edit-${exam.id}" value="${escapeHTML(exam.name)}" aria-label="Corrigir nome do exame">` : `<h3>${escapeHTML(exam.name)}</h3><p>${exam.type} · ${exam.prep}</p>`}</div>
      <div class="row-actions">${state.editingExam === exam.id ? `<button class="icon-btn" data-action="save-exam" data-id="${exam.id}">Salvar</button>` : `<button class="icon-btn" data-action="edit-exam" data-id="${exam.id}" aria-label="Corrigir ${escapeHTML(exam.name)}">Corrigir</button>`}<button class="icon-btn" data-action="remove-exam" data-id="${exam.id}" aria-label="Remover ${escapeHTML(exam.name)}">×</button></div>
    </article>`).join("") : `<div class="info-banner"><span>＋</span><div><strong>Nenhum exame selecionado</strong><p>Pesquise e adicione os exames que deseja agendar.</p></div></div>`;
  return `<span class="eyebrow">Confira antes de continuar</span><h1>${state.ocrDone ? "Encontramos estes exames" : "Escolha seus exames"}</h1><p>${state.ocrDone ? "Revise a lista identificada no pedido médico. Você pode corrigir, remover ou adicionar itens." : "Pesquise por nome e monte sua lista. O login será solicitado somente depois."}</p>
    <div class="exam-list">${rows}</div>
    <div class="add-exam"><label for="exam-search"><strong>Adicionar outro exame</strong></label><div class="add-row"><input class="input" id="exam-search" placeholder="Ex.: Vitamina D"><button class="btn btn-blue" data-action="add-exam">Pesquisar e adicionar</button></div><div id="exam-add-suggestions"></div></div>
    <div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next">Continuar com ${state.exams.length} exames</button></div>`;
}

function authStep() {
  return `<span class="eyebrow">Salve seu progresso</span><h1>Entre para continuar</h1><p>Agora precisamos identificar você para consultar cobertura e horários. Até aqui, foi possível montar o pedido sem login.</p>
    <div class="form-grid"><div class="field full"><label for="cpf">CPF</label><input class="input" id="cpf" value="123.456.789-00" inputmode="numeric"><small>CPF fictício para demonstração</small></div><div class="field full"><label for="password">Senha</label><input class="input" id="password" type="password" value="labdor-demo"></div></div>
    <div class="info-banner"><span>⌁</span><div><strong>Seus dados protegidos</strong><p>Na solução real, o acesso seguirá as políticas de segurança e privacidade da Rede D’Or.</p></div></div>
    <div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="login-continue">Entrar e continuar</button></div>`;
}

function patientStep() {
  return `<span class="eyebrow">Identificação</span><h1>Para quem são estes exames?</h1><p>Você pode agendar para você ou para um dependente vinculado.</p>
    <div class="choice-grid"><button class="choice-card ${state.patientType === "self" ? "is-selected" : ""}" data-action="select-patient" data-value="self"><strong>Para mim</strong><span>${escapeHTML(state.patient)} · titular</span></button><button class="choice-card ${state.patientType === "dependent" ? "is-selected" : ""}" data-action="select-patient" data-value="dependent"><strong>Dependente</strong><span>Selecionar ou cadastrar dependente</span></button></div>
    ${state.patientType === "dependent" ? `<div class="add-exam"><div class="field"><label for="dependent-select">Dependente</label><select class="select" id="dependent-select"><option>${escapeHTML(state.dependent)}</option><option>Marina Graziele</option></select></div><button style="margin-top:12px" class="link-button" data-action="toggle-dependent-form">+ Cadastrar novo dependente</button>${state.showDependentForm ? `<div class="form-grid"><div class="field"><label>Nome</label><input class="input" placeholder="Nome completo"></div><div class="field"><label>Data de nascimento</label><input class="input" type="date"></div></div>` : ""}</div>` : ""}
    <div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next">Continuar</button></div>`;
}

function payerStep() {
  return `<span class="eyebrow">Forma de atendimento</span><h1>Como você vai realizar estes exames?</h1><p>Essa escolha acontece depois da seleção dos exames para que a cobertura seja analisada item a item.</p>
    <div class="choice-grid"><button class="choice-card ${state.payer === "insurance" ? "is-selected" : ""}" data-action="select-payer" data-value="insurance"><strong>Tenho convênio</strong><span>Vamos consultar a cobertura do seu plano.</span></button><button class="choice-card ${state.payer === "private" ? "is-selected" : ""}" data-action="select-payer" data-value="private"><strong>Particular</strong><span>Veja os valores antes de escolher o local e horário.</span></button></div>
    <div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next">Continuar</button></div>`;
}

function cardStep() {
  return `<span class="eyebrow">Seu convênio</span><h1>Confirme os dados da carteirinha</h1><p>Selecione a operadora e envie uma foto. O Smart OCR preenche os campos para você revisar.</p>
    <div class="form-grid"><div class="field"><label for="insurer">Operadora</label><select class="select" id="insurer"><option>Bradesco Saúde</option><option>SulAmérica</option><option>Amil</option></select></div><div class="field"><label for="plan">Plano</label><input class="input" id="plan" value="Rede Nacional"></div></div>
    <div class="drop-zone" style="min-height:180px;margin-top:18px">${state.cardReady ? `<div class="file-ready"><div class="drop-icon" style="width:52px;height:52px;margin:0">✓</div><div><strong>Carteirinha identificada</strong><span>Bradesco Saúde · Rede Nacional</span></div></div>` : `<div><div class="drop-icon">▣</div><h3>Lendo sua carteirinha</h3><p>Smart OCR preenchendo os dados simulados...</p></div>`}</div>
    <div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next" ${state.cardReady ? "" : "disabled"}>Confirmar dados</button></div>`;
}

function eligibilityStep() {
  const items = state.exams.map(exam => {
    const covered = state.payer === "insurance" && exam.covered;
    const price = covered ? 0 : (exam.price || 89);
    return `<article class="coverage-item"><div><h3>${escapeHTML(exam.name)}</h3><p>${exam.type}</p></div><div class="coverage-price"><span class="chip ${covered ? "chip-success" : "chip-warning"}">${covered ? "Coberto" : "Particular"}</span><strong>${covered ? "R$ 0" : money(price)}</strong></div></article>`;
  }).join("");
  return `<span class="eyebrow">Exame + ${state.payer === "insurance" ? "convênio" : "particular"} + CEP</span><h1>${state.payer === "insurance" ? "Sua cobertura foi analisada" : "Valores do atendimento particular"}</h1><p>${state.payer === "insurance" ? "Mantivemos juntos os itens cobertos e os particulares para você resolver tudo em uma só jornada." : "Confira os valores simulados antes de escolher o atendimento."}</p>
    <div class="coverage-list">${items}</div><div class="price-total"><span>Total a pagar</span><strong>${money(privateTotal())}</strong></div>
    <div class="info-banner"><span>i</span><div><strong>Análise demonstrativa</strong><p>Cobertura, valores e elegibilidade são simulados e dependem do plano, exame e local.</p></div></div>
    <div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next">Continuar</button></div>`;
}

function locationStep() {
  return `<span class="eyebrow">Onde você está?</span><h1>Encontre o melhor atendimento perto de você</h1><p>Use uma localização simulada ou informe o CEP para ver unidades compatíveis com seus exames.</p>
    <div class="choice-grid"><button class="choice-card ${state.locationSet === "gps" ? "is-selected" : ""}" data-action="use-location"><strong>⌖ Usar minha localização</strong><span>Simulação: Itaim Bibi, São Paulo</span></button><button class="choice-card ${state.locationSet === "cep" ? "is-selected" : ""}" data-action="use-cep"><strong>Informar CEP</strong><span>Buscar por endereço</span></button></div>
    <div class="form-grid"><div class="field full"><label for="cep">CEP</label><input class="input" id="cep" value="${escapeHTML(state.cep)}" inputmode="numeric"></div></div>
    ${state.locationSet ? `<div class="info-banner success-banner"><span>✓</span><div><strong>Localização encontrada</strong><p>Rua Joaquim Floriano, Itaim Bibi · endereço demonstrativo.</p></div></div>` : ""}
    <div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next">Ver opções de atendimento</button></div>`;
}

function modalityStep() {
  if (hasImaging()) {
    state.mode = "unit";
    return `<span class="eyebrow">Modalidade recomendada</span><h1>Faça seus exames em uma única ida</h1><p>Como seu pedido inclui um exame de imagem, encontramos unidades onde você também pode realizar seus exames laboratoriais.</p>
      <div class="info-banner"><span>✦</span><div><strong>Por que esta é a melhor opção?</strong><p>A ressonância precisa ser feita em unidade. Reunimos os demais exames no mesmo agendamento para simplificar sua rotina.</p></div></div>
      <div class="choice-card is-selected"><strong>Realizar em uma unidade</strong><span>Imagem e análises clínicas no mesmo local · disponibilidade simulada</span></div>
      <button style="margin-top:14px" class="link-button" data-action="remove-imaging-demo">Quero ver como funciona sem o exame de imagem</button>
      <div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next">Ver unidades compatíveis</button></div>`;
  }
  return `<span class="eyebrow">Escolha como prefere</span><h1>Onde você quer realizar a coleta?</h1><p>Seus exames são elegíveis para coleta em casa ou atendimento em unidade.</p>
    <div class="choice-grid"><button class="choice-card ${state.mode === "home" ? "is-selected" : ""}" data-action="select-mode" data-value="home"><strong>Coleta em casa</strong><span>Sem taxa de deslocamento · endereço informado</span></button><button class="choice-card ${state.mode === "unit" ? "is-selected" : ""}" data-action="select-mode" data-value="unit"><strong>Realizar em uma unidade</strong><span>Escolha entre as unidades próximas.</span></button></div>
    <div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next">Continuar</button></div>`;
}

function unitStep() {
  if (state.mode === "home") {
    return `<span class="eyebrow">Coleta em casa</span><h1>Confirme o endereço da coleta</h1><p>Não há taxa de deslocamento. A disponibilidade exibida é simulada.</p><div class="card"><span class="chip chip-success">Área atendida</span><h3>Rua Joaquim Floriano, 466</h3><p>Itaim Bibi · São Paulo · SP · 04534-002</p><button class="btn btn-ghost btn-small" data-action="show-help">Alterar endereço</button></div><div class="info-banner"><span>✓</span><div><strong>Coleta domiciliar disponível</strong><p>Todos os exames atuais são compatíveis com atendimento em casa.</p></div></div><div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next">Escolher data e horário</button></div>`;
  }
  const units = [
    ["Hospital São Luiz Itaim", "Rua Dr. Alceu de Campos Rodrigues, Itaim Bibi", "1,8 km"],
    ["Hospital Vila Nova Star", "Rua Alceu de Campos Rodrigues, Vila Nova Conceição", "3,4 km"],
    ["Hospital São Luiz Anália Franco", "Rua Francisco Marengo, Tatuapé", "7,2 km"]
  ];
  return `<span class="eyebrow">Unidades compatíveis</span><h1>Escolha onde realizar seus exames</h1><p>Estas unidades demonstrativas realizam todos os exames do pedido na mesma ida.</p><div class="unit-list">${units.map(([name,address,distance]) => `<button class="unit-choice ${state.unit === name ? "is-selected" : ""}" data-action="select-unit" data-unit="${name}"><span class="category-icon">⌖</span><span><strong>${name}</strong><small style="display:block;color:var(--muted)">${address}</small></span><span class="distance">${distance}</span></button>`).join("")}</div><div class="info-banner"><span>i</span><div><strong>Conteúdo demonstrativo</strong><p>Nomes de unidades são reais. Horários, serviços, distância e disponibilidade são simulados.</p></div></div><div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next">Escolher horário</button></div>`;
}

function scheduleStep() {
  const dates = ["27 set", "28 set", "29 set", "30 set", "01 out"];
  const times = ["09:00", "10:30", "14:00", "15:30", "16:00"];
  return `<span class="eyebrow">Agenda inteligente</span><h1>Escolha o melhor horário</h1><p>Consideramos o preparo dos exames e a disponibilidade simulada da modalidade escolhida.</p><div class="info-banner"><span>☀</span><div><strong>Estes exames não exigem jejum nesta simulação</strong><p>Há mais disponibilidade no período da tarde.</p></div></div><div class="calendar-strip">${dates.map(date => `<button class="date-btn ${state.date === date ? "is-selected" : ""}" data-action="select-date" data-value="${date}"><span>${date.split(" ")[1]}</span><strong>${date.split(" ")[0]}</strong></button>`).join("")}</div><h3>Horários disponíveis</h3><div class="time-grid">${times.map(time => `<button class="time-btn ${state.time === time ? "is-selected" : ""} ${Number(time.split(":")[0]) >= 14 ? "recommended" : ""}" data-action="select-time" data-value="${time}">${time}</button>`).join("")}</div><p style="margin-top:12px;color:var(--muted);font-size:.75rem">Faixa azul: mais disponibilidade no período da tarde.</p><div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next">Revisar carrinho</button></div>`;
}

function cartStep() {
  const covered = state.payer === "insurance" ? state.exams.filter(exam => exam.covered) : [];
  const privateItems = state.payer === "insurance" ? state.exams.filter(exam => !exam.covered) : state.exams;
  return `<span class="eyebrow">Seu carrinho</span><h1>Revise antes de pagar</h1><p>Itens cobertos e particulares ficam juntos. Você paga somente o que não é coberto pelo convênio.</p><div class="cart-section">${covered.length ? `<div class="cart-group"><div class="cart-group-title"><span>Cobertos pelo convênio</span><span>${covered.length} itens</span></div>${covered.map(exam => `<div class="cart-line"><div><strong>${exam.name}</strong><span>${exam.type}</span></div><strong style="color:var(--success)">R$ 0</strong></div>`).join("")}</div>` : ""}<div class="cart-group"><div class="cart-group-title"><span>Atendimento particular</span><span>${privateItems.length} itens</span></div>${privateItems.map(exam => `<div class="cart-line"><div><strong>${exam.name}</strong><span>${exam.type}</span></div><strong>${money(state.payer === "private" ? (exam.price || 89) : exam.price)}</strong></div>`).join("")}</div></div><div class="checkout-total"><span>Total a pagar</span><strong>${money(privateTotal())}</strong></div><div class="info-banner"><span>⌖</span><div><strong>${state.mode === "home" ? "Coleta em casa" : state.unit}</strong><p>${state.date}, às ${state.time} · disponibilidade simulada</p></div></div><div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="flow-next">Ir para pagamento</button></div>`;
}

function checkoutStep() {
  return `<span class="eyebrow">Pagamento seguro</span><h1>Como você prefere pagar?</h1><p>Somente os itens particulares serão cobrados. Esta etapa é uma simulação e não processa pagamentos.</p><div class="choice-grid"><button class="choice-card ${state.payment === "pix" ? "is-selected" : ""}" data-action="select-payment" data-value="pix"><strong>Pix</strong><span>Aprovação imediata · QR code simulado</span></button><button class="choice-card ${state.payment === "card" ? "is-selected" : ""}" data-action="select-payment" data-value="card"><strong>Cartão de crédito</strong><span>Pagamento em ambiente seguro</span></button></div>${state.payment === "card" ? `<div class="form-grid"><div class="field full"><label>Número do cartão</label><input class="input" value="4111 1111 1111 1111"></div><div class="field"><label>Validade</label><input class="input" value="12/30"></div><div class="field"><label>CVV</label><input class="input" value="123"></div></div>` : `<div class="info-banner"><span>◇</span><div><strong>Pix selecionado</strong><p>O QR code demonstrativo será exibido após a confirmação.</p></div></div>`}<div class="checkout-total"><span>Total do pagamento</span><strong>${money(privateTotal())}</strong></div><div class="flow-actions"><button class="btn btn-ghost" data-action="flow-back">Voltar</button><button class="btn btn-primary" data-action="confirm-order">Confirmar agendamento</button></div>`;
}

function confirmationStep() {
  return `<div class="success-mark">✓</div><span class="eyebrow">Tudo certo</span><h1>Seu agendamento está confirmado</h1><p>Enviamos os detalhes para os canais cadastrados. Você também pode acompanhar tudo em Meus agendamentos.</p><div class="confirmation-grid"><div class="confirmation-item"><span>Paciente</span><strong>${escapeHTML(patientName())}</strong></div><div class="confirmation-item"><span>Data e horário</span><strong>${state.date} · ${state.time}</strong></div><div class="confirmation-item"><span>Atendimento</span><strong>${state.mode === "home" ? "Coleta em casa" : state.unit}</strong></div><div class="confirmation-item"><span>Valor pago</span><strong>${money(privateTotal())} via ${state.payment === "pix" ? "Pix" : "cartão"}</strong></div><div class="confirmation-item"><span>Exames</span><strong>${state.exams.length} itens</strong></div><div class="confirmation-item"><span>Preparo</span><strong>Ver instruções no agendamento</strong></div></div><div class="info-banner success-banner"><span>✓</span><div><strong>Protocolo LAB-280926</strong><p>Guarde este número para consultar o atendimento.</p></div></div><div class="flow-actions"><button class="btn btn-ghost" data-action="go-home">Voltar à home</button><button class="btn btn-primary" data-action="go-appointments">Ver meus agendamentos</button></div>`;
}

function renderVaccines() {
  const vaccines = [
    ["Influenza quadrivalente", "Proteção anual contra os principais tipos de gripe", 129],
    ["Herpes-zóster", "Esquema de proteção para adultos elegíveis", 699],
    ["HPV nonavalente", "Proteção ampliada conforme faixa etária", 889]
  ];
  main.innerHTML = `<section class="vaccine-hero"><div class="shell"><span class="eyebrow">Jornada separada</span><h1>Vacinas para cada fase da vida</h1><p>Escolha a vacina e agende separadamente dos exames. Valores e disponibilidade desta demonstração são simulados.</p></div></section><section class="section"><div class="shell"><div class="info-banner"><span>i</span><div><strong>Vacinas são agendadas separadamente</strong><p>Para garantir preparo e logística adequados, elas não entram no mesmo carrinho de exames.</p></div></div><div class="vaccine-grid">${vaccines.map(([name,desc,price]) => `<article class="card vaccine-card"><span class="chip">Vacina</span><h3>${name}</h3><p>${desc}</p><div class="card-price">${money(price)}</div><button class="btn btn-blue" data-action="add-vaccine" data-name="${name}" data-price="${price}">Agendar vacina</button></article>`).join("")}</div>${state.vaccineCart.length ? `<div class="cta-panel" style="margin-top:28px"><div><h2>${state.vaccineCart[0].name}</h2><p>Item adicionado ao carrinho separado de vacinas.</p></div><button class="btn btn-primary" data-action="vaccine-demo-finish">Escolher local e horário</button></div>` : ""}</div></section>`;
}

function renderAppointments() {
  const status = state.confirmed ? "Confirmado" : "Agendamento demonstrativo";
  main.innerHTML = `<section class="appointments-hero"><div class="shell"><span class="eyebrow">Área do paciente</span><h1>Meus agendamentos</h1><p>Acompanhe o status, consulte preparos e gerencie seus atendimentos.</p></div></section><section class="section section-soft"><div class="shell"><article class="card appointment-card"><div class="appointment-status"><div><span class="chip chip-success">${status}</span><h2 style="margin:9px 0 0;font-size:1.45rem">Exames laboratoriais e imagem</h2></div><strong>LAB-280926</strong></div><div class="appointment-body"><div class="confirmation-grid"><div class="confirmation-item"><span>Paciente</span><strong>${escapeHTML(patientName())}</strong></div><div class="confirmation-item"><span>Data e horário</span><strong>${state.date} · ${state.time}</strong></div><div class="confirmation-item"><span>Local</span><strong>${state.mode === "home" ? "Coleta em casa" : state.unit}</strong></div><div class="confirmation-item"><span>Valor</span><strong>${money(privateTotal())}</strong></div></div><div class="timeline"><div class="timeline-step done">Pedido confirmado</div><div class="timeline-step current">Agendamento</div><div class="timeline-step">Atendimento</div><div class="timeline-step">Resultados</div></div><div class="action-grid"><button class="btn btn-ghost btn-small" data-action="demo-action" data-message="Preparo exibido: consulte as orientações de cada exame.">Consultar preparo</button><button class="btn btn-ghost btn-small" data-action="demo-action" data-message="Pedido médico aberto em modo demonstrativo.">Ver pedido médico</button><button class="btn btn-ghost btn-small" data-action="demo-action" data-message="Mapa demonstrativo aberto.">Ver endereço e mapa</button><button class="btn btn-ghost btn-small" data-action="demo-action" data-message="Resultados ainda não estão disponíveis nesta simulação.">Acessar resultados</button><button class="btn btn-ghost btn-small" data-action="demo-action" data-message="Nota fiscal simulada preparada para download.">Nota fiscal</button><button class="btn btn-blue btn-small" data-action="reschedule">Reagendar</button><button class="btn btn-danger btn-small" data-action="cancel-appointment">Cancelar</button></div></div></article></div></section>`;
}

function startUpload(labOnly = false) {
  state.uploadReady = false;
  state.ocrDone = false;
  state.cardReady = false;
  state.exams = labOnly ? cloneDetectedExams().filter(exam => exam.type !== "Imagem") : cloneDetectedExams();
  state.mode = labOnly ? "home" : "unit";
  setRoute("flow", { step: 0 });
}

function chooseExams() {
  state.exams = [];
  state.ocrDone = false;
  setRoute("flow", { step: 2 });
}

function flowNext() {
  if (state.step === 0 && !state.uploadReady) return showToast("Escolha um arquivo ou use a câmera para continuar.");
  if (state.step === 2 && !state.exams.length) return showToast("Adicione pelo menos um exame para continuar.");
  if (state.step === 5) state.step = state.payer === "insurance" ? 6 : 7;
  else if (state.step === 8 && !state.locationSet) return showToast("Informe o CEP ou use a localização simulada.");
  else if (state.step < 14) state.step += 1;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function flowBack() {
  if (state.step === 2 && state.ocrDone) state.step = 0;
  else if (state.step === 7 && state.payer === "private") state.step = 5;
  else if (state.step > 0) state.step -= 1;
  else return setRoute("home");
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function addExamByQuery(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return showToast("Digite o nome do exame.");
  const match = examCatalog.find(exam => exam.name.toLowerCase().includes(normalized));
  if (!match) return showToast("Não encontramos esse exame na demonstração. Tente “Vitamina D”.");
  if (state.exams.some(exam => exam.id === match.id)) return showToast("Esse exame já está na sua lista.");
  state.exams.push({ ...match });
  render();
  showToast(`${match.name} adicionado.`);
}

document.addEventListener("input", event => {
  if (event.target.id === "home-search") {
    const query = event.target.value.trim().toLowerCase();
    const container = $("#home-suggestions");
    if (!query) return container.classList.remove("is-open");
    const matches = examCatalog.filter(exam => exam.name.toLowerCase().includes(query)).slice(0, 4);
    container.innerHTML = matches.map(exam => `<button class="suggestion" data-action="home-add-exam" data-id="${exam.id}"><span>${exam.name}</span><span class="chip">${exam.type}</span></button>`).join("") || `<div style="padding:10px;color:var(--muted)">Nenhum exame encontrado.</div>`;
    container.classList.add("is-open");
  }
});

document.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "go-home") setRoute("home");
  if (action === "toggle-menu") { state.menuOpen = !state.menuOpen; render(); }
  if (action === "start-upload") startUpload();
  if (action === "start-lab-only") startUpload(true);
  if (action === "choose-exams") chooseExams();
  if (action === "go-vaccines") setRoute("vaccines");
  if (action === "go-appointments") setRoute("appointments");
  if (action === "start-auth") { state.exams = state.exams.length ? state.exams : cloneDetectedExams(); setRoute("flow", { step: 3 }); }
  if (action === "scroll-home") {
    const id = target.dataset.target;
    if (state.route !== "home") { state.route = "home"; render(); setTimeout(() => $(`#${id}`)?.scrollIntoView({ behavior: "smooth" }), 50); }
    else $(`#${id}`)?.scrollIntoView({ behavior: "smooth" });
  }
  if (action === "show-help") openModal("Como podemos ajudar?", "Nesta demonstração, a central reúne dúvidas sobre pedido médico, cobertura, preparo, pagamentos e agendamentos.");
  if (action === "close-modal") closeModal();
  if (action === "search-exam") {
    const query = $("#home-search")?.value || "";
    state.exams = [];
    setRoute("flow", { step: 2 });
    if (query) addExamByQuery(query);
  }
  if (action === "home-add-exam") {
    const exam = examCatalog.find(item => item.id === target.dataset.id);
    state.exams = [{ ...exam }];
    setRoute("flow", { step: 2 });
  }
  if (action === "select-checkup") {
    state.exams = cloneDetectedExams().filter(exam => exam.type === "Análises clínicas");
    showToast(`Pacote ${target.dataset.checkup} selecionado para demonstração.`);
    setTimeout(() => setRoute("flow", { step: 2 }), 550);
  }
  if (action === "simulate-upload" || action === "simulate-camera") {
    state.uploadReady = true;
    state.uploadName = action === "simulate-camera" ? "foto-pedido-medico.jpg" : "pedido-medico.jpg";
    render();
  }
  if (action === "flow-next") flowNext();
  if (action === "flow-back") flowBack();
  if (action === "remove-exam") { state.exams = state.exams.filter(exam => exam.id !== target.dataset.id); render(); }
  if (action === "edit-exam") { state.editingExam = target.dataset.id; render(); setTimeout(() => $(`#edit-${target.dataset.id}`)?.focus(), 20); }
  if (action === "save-exam") {
    const exam = state.exams.find(item => item.id === target.dataset.id);
    const value = $(`#edit-${target.dataset.id}`)?.value.trim();
    if (value) exam.name = value;
    state.editingExam = null;
    render();
  }
  if (action === "add-exam") addExamByQuery($("#exam-search")?.value || "");
  if (action === "login-continue") { state.loggedIn = true; state.step = 4; render(); showToast("Acesso realizado em modo demonstrativo."); }
  if (action === "select-patient") { state.patientType = target.dataset.value; render(); }
  if (action === "toggle-dependent-form") { state.showDependentForm = !state.showDependentForm; render(); }
  if (action === "select-payer") { state.payer = target.dataset.value; state.cardReady = false; render(); }
  if (action === "use-location") { state.locationSet = "gps"; render(); }
  if (action === "use-cep") { state.locationSet = "cep"; state.cep = $("#cep")?.value || state.cep; render(); }
  if (action === "select-mode") { state.mode = target.dataset.value; render(); }
  if (action === "remove-imaging-demo") {
    state.exams = state.exams.filter(exam => exam.type !== "Imagem");
    state.mode = "home";
    render();
    showToast("Exame de imagem removido. A coleta em casa agora está disponível.");
  }
  if (action === "select-unit") { state.unit = target.dataset.unit; render(); }
  if (action === "select-date") { state.date = target.dataset.value; render(); }
  if (action === "select-time") { state.time = target.dataset.value; render(); }
  if (action === "select-payment") { state.payment = target.dataset.value; render(); }
  if (action === "confirm-order") { state.confirmed = true; state.step = 14; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  if (action === "demo-action") showToast(target.dataset.message);
  if (action === "reschedule") { setRoute("flow", { step: 11 }); showToast("Escolha uma nova data e horário."); }
  if (action === "cancel-appointment") openModal("Cancelar agendamento?", "Esta é uma ação simulada. Nenhum agendamento real será cancelado.", [{ label: "Manter agendamento", action: "close-modal", className: "btn-ghost" }, { label: "Simular cancelamento", action: "confirm-cancel", className: "btn-danger" }]);
  if (action === "confirm-cancel") { closeModal(); showToast("Cancelamento simulado. O agendamento real não foi alterado."); }
  if (action === "add-vaccine") {
    if (state.exams.length) {
      openModal("Vacinas são agendadas separadamente", "Você já iniciou uma jornada de exames. Conclua esse agendamento e depois volte para iniciar a jornada de vacinas.", [{ label: "Entendi", action: "close-modal", className: "btn-blue" }]);
    } else {
      state.vaccineCart = [{ name: target.dataset.name, price: Number(target.dataset.price) }];
      render();
      showToast("Vacina adicionada ao carrinho separado.");
    }
  }
  if (action === "vaccine-demo-finish") openModal("Jornada de vacina iniciada", "No protótipo, este estado demonstra o carrinho separado. A jornada principal completa permanece dedicada aos exames.");
});

render();
