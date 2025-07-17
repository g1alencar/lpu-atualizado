let services = [];

// Helper para fetch autenticado (envia o token JWT se existir)
function authFetch(url, options = {}) {
  options.headers = options.headers || {};
  options.headers["Authorization"] = "Bearer " + localStorage.getItem("token");
  return fetch(url, options);
}

// Busca os serviços na API
function carregarServicos() {
  authFetch("http://localhost:3000/api/servicos")
    .then(res => res.json())
    .then(dados => {
      services = dados;
      montarTabelaServicos();
    })
    .catch(err => {
      alert("Erro ao carregar serviços do servidor.");
      console.error(err);
    });
}

// Monta a tabela de serviços dinamicamente
function montarTabelaServicos() {
  const bodyTbl = document.getElementById("servicesBody");
  bodyTbl.innerHTML = "";
  services.forEach(s => {
    bodyTbl.insertAdjacentHTML("beforeend",
      `<tr>
        <td>${s.codigo || s.id || ""}</td>
        <td title="${s.descricao_completa || s.descricao || s.titulo}">
          <strong>${s.descricao || s.titulo}</strong><br>
          <small>${s.descricao_completa || s.descricao || ""}</small>
        </td>
        <td>${s.unidade || ""}</td>
        <td><input name='${s.codigo || s.id}' type='number' min='0' value='0' title="Quantidade de ${s.descricao || s.titulo}"></td>
      </tr>`
    );
  });
}

function val(id) {
  const el = document.getElementById(id);
  return el ? parseFloat(el.value) || 0 : 0;
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(v);
}

function calculate() {
  const profiles = ["gp","jr","pl","sr"];
  const totals = {gp:0,jr:0,pl:0,sr:0}; 
  let sel = [];
  services.forEach(s => {
    const codigo = s.codigo || s.id;
    const qty = parseFloat(document.forms.lpuForm.elements[codigo].value) || 0;
    if (qty > 0) { 
      sel.push({...s, qty}); 
      totals.gp += (parseFloat(s.horas_gp) || 0) * qty;
      totals.jr += (parseFloat(s.horas_jr) || 0) * qty;
      totals.pl += (parseFloat(s.horas_pl) || 0) * qty;
      totals.sr += (parseFloat(s.horas_sr) || 0) * qty;
    }
  });
  const months = val('supportMonths'); if(months>0) totals.sr+=months*1.5;
  const hb = document.getElementById('hoursBody'); hb.innerHTML='';
  profiles.forEach(p=> hb.insertAdjacentHTML('beforeend', `<tr><td>${p}</td><td>${totals[p].toFixed(1)}</td></tr>`));
  const totalH = profiles.reduce((a,p)=>a+totals[p],0);
  document.getElementById('totalHours').textContent=totalH.toFixed(1);
  const rates={gp:val('rate-gp'),jr:val('rate-jr'),pl:val('rate-pl'),sr:val('rate-sr')};
  const costBody=document.getElementById('costBody'); costBody.innerHTML='';
  let totalCost=0; const supExp=months*80;
  const showCost=Object.values(rates).some(n=>n>0)||months>0;
  document.getElementById('costSection').style.display= showCost ? 'block' : 'none';
  if(showCost){
    if(Object.values(rates).some(n=>n>0)){
      profiles.forEach(p=>{ const sub=totals[p]*rates[p]; totalCost+=sub;
        costBody.insertAdjacentHTML('beforeend', `<tr><td>${p}</td><td>${totals[p].toFixed(1)}</td><td>${rates[p].toFixed(2)}</td><td>${fmt(sub)}</td></tr>`);
      });
    }
    if(months>0){ totalCost+=supExp;
      costBody.insertAdjacentHTML('beforeend', `<tr><td colspan='3'>Despesa suporte (${months}m × 80)</td><td>${fmt(supExp)}</td></tr>`);
    }
    document.getElementById('totalCost').textContent = fmt(totalCost);
  }
  let txt=`Cliente: ${document.getElementById('clientName').value||'[cliente]'}\nData: ${new Date().toLocaleDateString()}\n\nItens:`;
  sel.forEach(s=> txt+=`\n- ${(s.codigo || s.id)} (${s.descricao || s.titulo}) ×${s.qty}`);
  if(months>0) txt+=`\n- Suporte continuado: ${months} mês(es)`;
  txt+="\n\nHoras:";
  profiles.forEach(p=> txt+=`\n  ${p}: ${totals[p].toFixed(1)}h`);
  txt+=`\nTotal horas: ${totalH.toFixed(1)}h`;
  if(months>0) txt+=`\nHoras SR suporte: ${(months*1.5).toFixed(1)}h\nDespesa suporte: ${fmt(supExp)}`;
  document.getElementById('summary').value = txt;
  document.getElementById('output').style.display = 'block';
  document.getElementById('formMessage').innerHTML = "<span style='color:green;'>Cálculo realizado!</span>";
}

// Botão calcular
document.getElementById('calcBtn').addEventListener('click', calculate);

// Copiar resumo
document.getElementById('copyBtn').addEventListener('click', () => {
  const t = document.getElementById('summary'); t.select(); document.execCommand('copy');
  document.getElementById('formMessage').innerHTML = "Resumo copiado!";
  setTimeout(() => { document.getElementById('formMessage').innerHTML = ""; }, 1500);
});

// Múltiplos projetos no localStorage
function getAllProjects() {
  return JSON.parse(localStorage.getItem("lpu_projects") || "{}");
}
function saveAllProjects(obj) {
  localStorage.setItem("lpu_projects", JSON.stringify(obj));
}
function fillProjectList(selected) {
  const sel = document.getElementById("projectsList");
  const projects = getAllProjects();
  sel.innerHTML = "";
  Object.keys(projects).forEach(name => {
    sel.insertAdjacentHTML("beforeend", `<option ${name===selected?'selected':''}>${name}</option>`);
  });
}
function readProjectForm() {
  const servicesObj = {};
  services.forEach(s => {
    servicesObj[s.codigo || s.id] = document.forms.lpuForm.elements[s.codigo || s.id].value;
  });
  return {
    clientName: document.getElementById('clientName').value,
    rates: {
      gp: val('rate-gp'),
      jr: val('rate-jr'),
      pl: val('rate-pl'),
      sr: val('rate-sr'),
    },
    supportMonths: val('supportMonths'),
    services: servicesObj
  };
}
function applyProjectToForm(project) {
  document.getElementById('clientName').value = project.clientName || "";
  document.getElementById('rate-gp').value = project.rates.gp || "";
  document.getElementById('rate-jr').value = project.rates.jr || "";
  document.getElementById('rate-pl').value = project.rates.pl || "";
  document.getElementById('rate-sr').value = project.rates.sr || "";
  document.getElementById('supportMonths').value = project.supportMonths || 0;
  services.forEach(s => {
    document.forms.lpuForm.elements[s.codigo || s.id].value = project.services[s.codigo || s.id] || 0;
  });
}
function validateProjectName(name) {
  return !!name && /^[A-Za-z0-9 _-]{2,30}$/.test(name);
}

// ==== LOGOUT e USER INFO ====
function setUserInfo() {
  const user = localStorage.getItem("user") || "";
  document.getElementById("userInfo").innerHTML = user ? `Logado como: <b>${user}</b>` : "";
}

// Mostrar/esconder telas e user ao carregar página
window.addEventListener("DOMContentLoaded", () => {
  setUserInfo();
  if (localStorage.getItem("token")) {
    document.body.classList.add("logado");
    document.getElementById("loginBox").style.display = "none";
    document.querySelector(".main-app").style.display = "block";
    document.getElementById("logoutBtn").style.display = "block";
    if (window.carregarServicos) carregarServicos();
  } else {
    document.body.classList.remove("logado");
    document.getElementById("loginBox").style.display = "flex";
    document.querySelector(".main-app").style.display = "none";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("userInfo").innerHTML = "";
  }
});

// Logout
document.getElementById("logoutBtn").onclick = function() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  document.body.classList.remove("logado");
  document.getElementById("loginBox").style.display = "flex";
  document.querySelector(".main-app").style.display = "none";
  document.getElementById("logoutBtn").style.display = "none";
  document.getElementById("userInfo").innerHTML = "";
  if (document.getElementById("formMessage")) document.getElementById("formMessage").innerHTML = "";
};

// Exportação PDF
document.getElementById('pdfBtn').onclick = function() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF não carregado!");
    return;
  }
  const doc = new window.jspdf.jsPDF({orientation: "portrait", unit: "pt", format: "a4"});
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Proposta de Serviços NetApp", pageWidth / 2, 50, {align: "center"});
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Cliente: ${document.getElementById('clientName').value||'[cliente]'}`, 40, 100);
  doc.text(`Data: ${new Date().toLocaleDateString()}`, 40, 120);

  let lastY = 150;

  // Tabela de serviços
  let servRows = [];
  services.forEach(s => {
    const qty = parseFloat(document.forms.lpuForm.elements[s.codigo || s.id].value) || 0;
    if (qty > 0) {
      servRows.push([s.codigo || s.id, s.descricao || s.titulo, qty]);
    }
  });
  if (servRows.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Serviços Selecionados:", 40, lastY);
    doc.autoTable({
      startY: lastY + 10,
      head: [['Código', 'Descrição', 'Qtd.']],
      body: servRows,
      styles: {font: "helvetica", fontSize: 11},
      margin: {left: 40, right: 40},
      headStyles: {fillColor: [0,91,150]},
    });
    lastY = doc.lastAutoTable.finalY + 30;
  }

  // Resumo do projeto
  doc.setFont("helvetica", "bold");
  doc.text("Resumo do Projeto:", 40, lastY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const resumo = document.getElementById('summary').value || "";
  const splitText = doc.splitTextToSize(resumo, 500);
  doc.text(splitText, 40, lastY + 18);

  doc.save(`Proposta_${document.getElementById('clientName').value||'cliente'}.pdf`);
};

// Exportação CSV
document.getElementById('csvBtn').onclick = function() {
  let csv = `Cliente,${document.getElementById('clientName').value}\nData,${new Date().toLocaleDateString()}\n\nServiços Selecionados:\nCódigo,Descrição,Quantidade\n`;
  services.forEach(s => {
    const qty = parseFloat(document.forms.lpuForm.elements[s.codigo || s.id].value) || 0;
    if (qty > 0) {
      csv += `"${s.codigo || s.id}","${s.descricao || s.titulo}",${qty}\n`;
    }
  });
  csv += `\nResumo do Projeto:\n"${(document.getElementById('summary').value || "").replace(/\n/g, "\\n")}"\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Proposta_${document.getElementById('clientName').value||'cliente'}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Busca dinâmica de serviços
document.getElementById("serviceSearch").addEventListener("input", function() {
  const search = this.value.trim().toLowerCase();
  const trs = document.getElementById("servicesBody").querySelectorAll("tr");
  trs.forEach(tr => {
    const txt = tr.textContent.toLowerCase();
    tr.style.display = txt.includes(search) ? "" : "none";
  });
});
