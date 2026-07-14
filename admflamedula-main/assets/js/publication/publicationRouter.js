import { checkCmsAccess } from "./publicationPermissions.js";
import { publicationState, resetPublicationEditorState } from "./publicationState.js";
import { openPublicationModal, closePublicationModal } from "./publicationModal.js";
import {
  listPublicationItems,
  createPublicationItem,
  updatePublicationItem,
  deletePublicationItem
} from "../services/publicationService.js";
import { showToast } from "../toast.js";
import {
  applyAssetToPayload,
  clearSelectedPublicationAsset,
  getPreferredAssetUrl,
  isPublicationUploadBusy,
  normalizeMediaItemPayload,
  setPublicationSaveStatus,
  setPublicationUploadStatus,
  syncPublicationUploadControls
} from "./publicationMedia.js";
import {
  buildYouTubeMetadataFallback,
  resolveYouTubeMetadata
} from "../services/youtubeMetadataService.js";
import { escapeHtml, safeHttpUrl } from "../utils.js";
import { getPublicationConfig, getPublicationTypeFromTab } from "./publicationRegistry.js";
import { reportOperationalFailure } from "../services/operationalEventService.js";

let initialized = false;
let youtubeResolveTimeout = null;

const DEFAULT_WHATSAPP_URL = "https://wa.me/558599280682";

function getOfficialWhatsAppUrl() {
  return window.FLAMEDULA_CONFIG?.OFFICIAL_WHATSAPP_URL || DEFAULT_WHATSAPP_URL;
}

export async function initPublicationRouter(tabId) {
  const check = await checkCmsAccess();
  if (!check.active) {
    showToast("Acesso ao CMS negado.", "error");
    window.location.hash = "overview";
    return;
  }

  publicationState.role = check.role;
  publicationState.activeType = getContentTypeFromTab(tabId);
  publicationState.page = 1;

  await loadItems();

  const queuedComposer = sessionStorage.getItem("flamedula:open-publication-composer");
  if (queuedComposer === tabId && publicationState.role !== "viewer") {
    sessionStorage.removeItem("flamedula:open-publication-composer");
    openCreateForm();
  }
}

function getContentTypeFromTab(tabId) {
  return getPublicationTypeFromTab(tabId);
}

function getTableFromType(type) {
  return getPublicationConfig(type).table;
}

async function loadItems() {
  publicationState.loading = true;
  renderShell();

  const table = getTableFromType(publicationState.activeType);
  const result = await listPublicationItems(table, {
    page: publicationState.page,
    pageSize: publicationState.pageSize
  });

  publicationState.loading = false;

  if (result.error) {
    publicationState.error = result.error.message;
    publicationState.items = [];
    publicationState.totalItems = 0;
  } else {
    publicationState.items = result.data || [];
    publicationState.totalItems = result.total || 0;
    publicationState.error = "";
  }

  renderShell();
}

function renderShell() {
  const config = getPublicationConfig(publicationState.activeType);
  const containerId = `tab-${config.tab}`;

  const container = document.getElementById(containerId);
  if (!container) return;

  const isViewer = publicationState.role === "viewer";
  const typeLabel = config.singular;

  container.innerHTML = `
    <div class="section-heading">
      <div>
        <h2>${escapeHtml(config.heading)}</h2>
        <p>${publicationState.totalItems} registros cadastrados</p>
      </div>
      ${!isViewer ? `
        <button class="action-button primary" type="button" id="btnNewPublication">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          <span>Novo ${escapeHtml(typeLabel)}</span>
        </button>
      ` : ""}
    </div>

    <article class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Imagem</th>
              <th>Título</th>
              <th>Ordem</th>
              <th>Status</th>
              <th>Última Atualização</th>
              <th style="width: 150px; text-align: right;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${renderRows()}
          </tbody>
        </table>
      </div>
      ${renderPaginationControls()}
    </article>
  `;

  // Bind local events on generated controls
  const newBtn = container.querySelector("#btnNewPublication");
  if (newBtn) newBtn.addEventListener("click", () => openCreateForm());

  container.querySelectorAll(".btn-edit-pub").forEach(btn => {
    btn.addEventListener("click", () => openEditForm(btn.dataset.id));
  });

  container.querySelectorAll(".btn-delete-pub").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteItem(btn.dataset.id));
  });

  container.querySelectorAll(".btn-toggle-pub").forEach(btn => {
    btn.addEventListener("click", () => handleTogglePublish(btn.dataset.id, btn.dataset.published === "true"));
  });

  bindPaginationEvents(container);
}

function renderRows() {
  const config = getPublicationConfig(publicationState.activeType);
  if (publicationState.loading) {
    return `<tr><td colspan="6" style="text-align: center; padding: 32px 0;">Carregando registros...</td></tr>`;
  }

  if (publicationState.error) {
    return `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 32px 0;">${escapeHtml(publicationState.error)}</td></tr>`;
  }

  if (!publicationState.items.length) {
    return `<tr><td colspan="6" style="text-align: center; padding: 32px 0;">Nenhum registro encontrado.</td></tr>`;
  }

  return publicationState.items.map(item => {
    const isPublished = item.published === true;
    const now = Date.now();
    const scheduledAt = item.scheduled_for ? new Date(item.scheduled_for).getTime() : null;
    const expiresAt = item.expires_at ? new Date(item.expires_at).getTime() : null;
    const isScheduled = isPublished && scheduledAt && scheduledAt > now;
    const isExpired = isPublished && expiresAt && expiresAt <= now;
    const statusLabel = isExpired ? "Expirado" : isScheduled ? "Agendado" : isPublished ? "Publicado" : "Rascunho";
    const statusTone = isExpired ? "danger" : isScheduled ? "info" : isPublished ? "positive" : "warning";
    const dateStr = item.updated_at ? new Date(item.updated_at).toLocaleString("pt-BR") : "-";
    const imgUrl = safeHttpUrl(item.image_url);

    return `
      <tr>
        <td>
          <div class="table-thumb">
            ${imgUrl ? `<img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.image_alt || item[config.titleField] || '')}" loading="lazy">` : `<div class="thumb-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>`}
          </div>
        </td>
        <td><strong>${escapeHtml(item[config.titleField] || "-")}</strong></td>
        <td>${item.sort_order ?? 0}</td>
        <td>
          <span class="badge ${statusTone}">
            ${statusLabel}
          </span>
        </td>
        <td>${dateStr}</td>
        <td style="text-align: right;">
          <div class="row-actions" style="justify-content: flex-end;">
            ${publicationState.role !== "viewer" ? `
              <button class="icon-button btn-toggle-pub" data-id="${item.id}" data-published="${isPublished}" title="${isPublished ? 'Despublicar' : 'Publicar'}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-power"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>
              </button>
              <button class="icon-button btn-edit-pub" data-id="${item.id}" title="Editar">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
            ` : ""}
            ${publicationState.role === "owner" ? `
              <button class="icon-button soft-danger btn-delete-pub" data-id="${item.id}" title="Excluir">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderPaginationControls() {
  const totalPages = Math.ceil(publicationState.totalItems / publicationState.pageSize);
  if (totalPages <= 1) return "";

  return `
    <div class="pagination-controls" style="display:flex; justify-content:space-between; align-items:center; padding:16px;">
      <span>Mostrando registros ${(publicationState.page - 1) * publicationState.pageSize + 1} a ${Math.min(publicationState.page * publicationState.pageSize, publicationState.totalItems)} de ${publicationState.totalItems}</span>
      <div style="display:flex; gap:8px;">
        <button class="action-button secondary" id="btnPubPrev" ${publicationState.page === 1 ? 'disabled' : ''}>Anterior</button>
        <button class="action-button secondary" id="btnPubNext" ${publicationState.page >= totalPages ? 'disabled' : ''}>Próximo</button>
      </div>
    </div>
  `;
}

function bindPaginationEvents(container) {
  const prevBtn = container.querySelector("#btnPubPrev");
  const nextBtn = container.querySelector("#btnPubNext");

  if (prevBtn) {
    prevBtn.addEventListener("click", async () => {
      publicationState.page--;
      await loadItems();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", async () => {
      publicationState.page++;
      await loadItems();
    });
  }
}

function openCreateForm() {
  resetPublicationEditorState();
  publicationState.editorMode = "create";

  const typeLabel = getPublicationConfig(publicationState.activeType).singular;
  const bodyMarkup = buildFormFieldsMarkup({});

  openPublicationModal({
    title: `Criar ${typeLabel}`,
    kicker: "Publicação",
    bodyMarkup
  });
  bindMediaTypeControls();
}

function openEditForm(id) {
  const item = publicationState.items.find(i => String(i.id) === String(id));
  if (!item) return;

  resetPublicationEditorState();
  publicationState.editorMode = "edit";
  publicationState.editingId = id;
  publicationState.formData = { ...item };
  publicationState.selectedAsset = item.image_asset_id ? {
    id: item.image_asset_id,
    card_url: item.image_url,
    image_url: item.image_url,
    thumbnail_url: item.thumbnail_url,
    cloudinary_public_id: item.cloudinary_public_id,
    alt_text: item.image_alt
  } : null;

  const typeLabel = getPublicationConfig(publicationState.activeType).singular;
  const bodyMarkup = buildFormFieldsMarkup(item);

  openPublicationModal({
    title: `Editar ${typeLabel}`,
    kicker: "Publicação",
    bodyMarkup
  });
  bindMediaTypeControls();
}

function getMediaEditorType(item = {}) {
  const type = String(item.type || "").toLowerCase();
  if (type === "youtube" || item.youtube_id) return "youtube";
  if (type === "image" || type === "card" || item.image_asset_id || item.image_url) return "image";
  if (type === "link" || item.url) return "link";
  return "youtube";
}

function getSelectedMediaType() {
  return document.getElementById("pub_type")?.value || "youtube";
}

function bindMediaTypeControls() {
  if (publicationState.activeType !== "media_items") return;

  const typeSelect = document.getElementById("pub_type");
  const youtubeInput = document.getElementById("pub_youtube_url");
  if (!typeSelect) return;

  typeSelect.addEventListener("change", () => {
    if (typeSelect.value !== "image" && publicationState.selectedAsset) {
      clearSelectedPublicationAsset();
    }
    syncMediaTypePanels();
  });

  youtubeInput?.addEventListener("input", () => {
    clearTimeout(youtubeResolveTimeout);
    youtubeResolveTimeout = setTimeout(() => resolveYouTubeFromInput(), 650);
  });

  youtubeInput?.addEventListener("paste", () => {
    clearTimeout(youtubeResolveTimeout);
    youtubeResolveTimeout = setTimeout(() => resolveYouTubeFromInput(), 100);
  });

  syncMediaTypePanels();
}

function syncMediaTypePanels() {
  const config = getPublicationConfig(publicationState.activeType);
  const imageSidebar = document.getElementById("imageEditorSidebar");
  const altInput = document.getElementById("pub_image_alt");

  if (publicationState.activeType !== "media_items") {
    document.querySelectorAll("[data-media-panel]").forEach((panel) => {
      panel.hidden = true;
    });
    if (imageSidebar) imageSidebar.hidden = !config.supportsImage;
    if (altInput?.closest(".form-field-group")) {
      altInput.closest(".form-field-group").hidden = !config.supportsImage;
    }
    updateWizardMediaCopy(config.supportsImage ? "image" : "none");
    syncPublicationUploadControls();
    return;
  }

  const type = getSelectedMediaType();
  document.querySelectorAll("[data-media-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.mediaPanel !== type;
  });

  if (imageSidebar) imageSidebar.hidden = type !== "image";

  if (altInput) altInput.closest(".form-field-group").hidden = type !== "image";

  updateWizardMediaCopy(type);
  syncPublicationUploadControls();
}

function updateWizardMediaCopy(type) {
  const title = document.getElementById("wizardMediaTitle");
  const description = document.getElementById("wizardMediaDescription");
  const guidanceTitle = document.getElementById("wizardMediaGuidanceTitle");
  const guidanceText = document.getElementById("wizardMediaGuidanceText");
  const copies = {
    image: {
      title: "Escolha uma imagem",
      description: "Envie uma imagem nova ou escolha uma imagem que já está no sistema.",
      guidanceTitle: "Como escolher",
      guidanceText: "Use “Enviar nova imagem” para um arquivo do computador. Use “Usar imagem já enviada” para abrir a galeria do sistema."
    },
    youtube: {
      title: "Cole o link do vídeo",
      description: "Use o endereço completo do vídeo no YouTube.",
      guidanceTitle: "O sistema prepara a prévia",
      guidanceText: "Depois de colar o link, aguarde o título e a imagem do vídeo aparecerem."
    },
    link: {
      title: "Informe o link externo",
      description: "Cole o endereço completo da página que será aberta.",
      guidanceTitle: "Confira o endereço",
      guidanceText: "O link deve começar com https:// para funcionar corretamente."
    },
    none: {
      title: "Nenhuma imagem é necessária",
      description: "Este tipo de conteúdo não usa imagem.",
      guidanceTitle: "Próximo passo",
      guidanceText: "Clique em “Revisar publicação” para conferir as informações antes de salvar."
    }
  };
  const copy = copies[type] || copies.image;
  if (title) title.textContent = copy.title;
  if (description) description.textContent = copy.description;
  if (guidanceTitle) guidanceTitle.textContent = copy.guidanceTitle;
  if (guidanceText) guidanceText.textContent = copy.guidanceText;
  if (publicationState.wizardStep === 1) {
    const nextButton = document.getElementById("btnWizardNext");
    if (nextButton) nextButton.textContent = getStepOneNextLabel();
  }
}

function getStepOneNextLabel() {
  if (publicationState.activeType === "media_items") {
    const type = getSelectedMediaType();
    if (type === "youtube") return "Ir para o vídeo";
    if (type === "link") return "Ir para o link";
  }
  return getPublicationConfig(publicationState.activeType).supportsImage
    ? "Ir para a imagem"
    : "Continuar";
}

async function resolveYouTubeFromInput() {
  if (publicationState.activeType !== "media_items" || getSelectedMediaType() !== "youtube") return;

  const input = document.getElementById("pub_youtube_url");
  const value = input?.value || "";
  const fallback = buildYouTubeMetadataFallback(value);

  if (!fallback) {
    if (value.trim()) setYouTubeStatus("Cole uma URL valida do YouTube.", "error");
    return;
  }

  setYouTubeStatus("Buscando informacoes do video...", "loading");

  try {
    const metadata = await resolveYouTubeMetadata(value);
    applyYouTubeMetadata(metadata);
    setYouTubeStatus(
      metadata.fallback
        ? "Nao foi possivel obter o titulo automaticamente. Voce pode preencher manualmente."
        : "Video encontrado.",
      metadata.fallback ? "warning" : "success"
    );
  } catch (error) {
    applyYouTubeMetadata(fallback);
    setYouTubeStatus(error.message || "Nao foi possivel obter o titulo automaticamente.", "warning");
  }
}

function applyYouTubeMetadata(metadata) {
  if (!metadata?.videoId) return;

  const titleInput = document.getElementById("pub_title");
  const urlInput = document.getElementById("pub_youtube_url");
  const idInput = document.getElementById("pub_youtube_id");
  const thumbInput = document.getElementById("pub_youtube_thumbnail_url");
  const embedInput = document.getElementById("pub_youtube_embed_url");
  const preview = document.getElementById("youtubePreview");
  const previewFrame = preview?.querySelector(".youtube-preview-frame");
  const previewTitle = document.getElementById("youtubePreviewTitle");
  const previewAuthor = document.getElementById("youtubePreviewAuthor");

  if (urlInput) urlInput.value = metadata.canonicalUrl || urlInput.value;
  if (idInput) idInput.value = metadata.videoId;
  if (thumbInput) thumbInput.value = metadata.thumbnailUrl || "";
  if (embedInput) embedInput.value = metadata.embedUrl || "";
  if (titleInput && metadata.title && !titleInput.value.trim()) titleInput.value = metadata.title;

  if (preview && previewFrame && metadata.thumbnailUrl) {
    preview.hidden = false;
    previewFrame.innerHTML = `<img src="${escapeHtml(metadata.thumbnailUrl)}" alt="${escapeHtml(metadata.title || "Preview do video")}">`;
  }
  if (previewTitle) previewTitle.textContent = metadata.title || titleInput?.value || "Video do YouTube";
  if (previewAuthor) previewAuthor.textContent = metadata.authorName || "";
}

function setYouTubeStatus(message, tone = "success") {
  const status = document.getElementById("youtubeMetadataStatus");
  if (!status) return;
  status.hidden = !message;
  status.className = `youtube-status ${tone}`;
  status.textContent = message;
}

function buildLegacyFormFieldsMarkup(item) {
  const config = getPublicationConfig(publicationState.activeType);
  const isHero = publicationState.activeType === "hero_news";
  const isAction = publicationState.activeType === "actions";
  const isMedia = publicationState.activeType === "media_items";
  const isTestimonial = publicationState.activeType === "testimonials";
  const isTeam = publicationState.activeType === "team_members";
  const isFaq = publicationState.activeType === "faq_items";
  const isMetric = publicationState.activeType === "transparency_metrics";
  const mediaEditorType = isMedia ? getMediaEditorType(item) : "";

  let specificFields = "";
  if (isHero) {
    specificFields = `
      <div class="form-field-group">
        <label for="pub_title">Título *</label>
        <input type="text" id="pub_title" name="title" value="${escapeHtml(item.title || '')}" required>
      </div>
      <div class="form-field-group">
        <label for="pub_subtitle">Texto de apoio (opcional)</label>
        <textarea id="pub_subtitle" name="subtitle" rows="3" placeholder="Explique a informação principal em poucas palavras">${escapeHtml(item.subtitle || '')}</textarea>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_category">Categoria (opcional)</label>
          <input type="text" id="pub_category" name="category" value="${escapeHtml(item.category || '')}">
        </div>
        <div class="form-field-group">
          <label for="pub_sort_order">Posição no site</label>
          <input type="number" id="pub_sort_order" name="sort_order" value="${item.sort_order ?? 0}">
          <span class="field-help">Use 0 para aparecer primeiro.</span>
        </div>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_cta_label">Texto que aparece no botão</label>
          <input type="text" id="pub_cta_label" name="cta_label" value="${escapeHtml(item.cta_label || 'Falar no WhatsApp')}" placeholder="Ex.: Falar no WhatsApp">
          <span class="field-help">Esse texto aparecerá no botão da publicação.</span>
        </div>
        <div class="form-field-group">
          <label for="pub_cta_url">Para onde o botão leva</label>
          <input type="url" id="pub_cta_url" name="cta_url" class="fixed-link-input" value="${escapeHtml(getOfficialWhatsAppUrl())}" readonly aria-readonly="true">
          <span class="field-help fixed-link-help">Link fixo para o WhatsApp oficial. Você não precisa alterar.</span>
        </div>
      </div>
    `;
  } else if (isAction) {
    specificFields = `
      <div class="form-field-group">
        <label for="pub_title">Título *</label>
        <input type="text" id="pub_title" name="title" value="${escapeHtml(item.title || '')}" required>
      </div>
      <div class="form-field-group">
        <label for="pub_summary">Texto de apoio (opcional)</label>
        <textarea id="pub_summary" name="summary" rows="3" placeholder="Conte brevemente o que aconteceu ou vai acontecer">${escapeHtml(item.summary || '')}</textarea>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_action_date">Data da ação (opcional)</label>
          <input type="date" id="pub_action_date" name="action_date" value="${item.action_date || ''}">
        </div>
        <div class="form-field-group">
          <label for="pub_location">Local (opcional)</label>
          <input type="text" id="pub_location" name="location" value="${escapeHtml(item.location || '')}">
        </div>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_action_status">Situação da ação (opcional)</label>
          <input type="text" id="pub_action_status" name="action_status" value="${escapeHtml(item.action_status || '')}" placeholder="Ex.: Realizada ou Em breve">
        </div>
        <div class="form-field-group">
          <label for="pub_sort_order">Posição no site</label>
          <input type="number" id="pub_sort_order" name="sort_order" value="${item.sort_order ?? 0}">
          <span class="field-help">Use 0 para aparecer primeiro.</span>
        </div>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_cta_label">Texto que aparece no botão</label>
          <input type="text" id="pub_cta_label" name="cta_label" value="${escapeHtml(item.cta_label || 'Falar no WhatsApp')}" placeholder="Ex.: Falar no WhatsApp">
          <span class="field-help">Esse texto aparecerá no botão da publicação.</span>
        </div>
        <div class="form-field-group">
          <label for="pub_cta_url">Para onde o botão leva</label>
          <input type="url" id="pub_cta_url" name="cta_url" class="fixed-link-input" value="${escapeHtml(getOfficialWhatsAppUrl())}" readonly aria-readonly="true">
          <span class="field-help fixed-link-help">Link fixo para o WhatsApp oficial. Você não precisa alterar.</span>
        </div>
      </div>
    `;
  } else if (isMedia) {
    specificFields = `
      <div class="form-field-group">
        <label for="pub_type">O que você quer publicar? *</label>
        <select id="pub_type" name="type" required>
          <option value="youtube" ${mediaEditorType === "youtube" ? "selected" : ""}>Vídeo do YouTube — colar o link</option>
          <option value="image" ${mediaEditorType === "image" ? "selected" : ""}>Imagem — enviar ou usar da galeria</option>
          <option value="link" ${mediaEditorType === "link" ? "selected" : ""}>Link para outro site</option>
        </select>
      </div>
      <div class="form-field-group">
        <label for="pub_title">Título *</label>
        <input type="text" id="pub_title" name="title" value="${escapeHtml(item.title || '')}" required>
      </div>
      <div class="form-field-group">
        <label for="pub_description">Texto de apoio (opcional)</label>
        <textarea id="pub_description" name="description" rows="3">${escapeHtml(item.description || '')}</textarea>
      </div>
      <div class="media-type-panel" id="youtubeMediaFields" data-media-panel="youtube">
        <div class="form-field-group">
          <label for="pub_youtube_url">Cole o link do vídeo do YouTube</label>
          <input type="url" id="pub_youtube_url" name="url" value="${escapeHtml(item.url || '')}" placeholder="https://www.youtube.com/watch?v=...">
        </div>
        <input type="hidden" id="pub_youtube_id" name="youtube_id" value="${escapeHtml(item.youtube_id || '')}">
        <input type="hidden" id="pub_youtube_thumbnail_url" name="thumbnail_url" value="${escapeHtml(item.thumbnail_url || '')}">
        <input type="hidden" id="pub_youtube_embed_url" name="embed_url" value="${escapeHtml(item.embed_url || '')}">
        <div class="youtube-status" id="youtubeMetadataStatus" hidden></div>
        <div class="youtube-preview" id="youtubePreview" ${item.thumbnail_url ? "" : "hidden"}>
          <div class="youtube-preview-frame">
            ${item.thumbnail_url ? `<img src="${escapeHtml(item.thumbnail_url)}" alt="${escapeHtml(item.title || 'Preview do video')}">` : ""}
          </div>
          <div class="youtube-preview-meta">
            <strong id="youtubePreviewTitle">${escapeHtml(item.title || "Video do YouTube")}</strong>
            <span id="youtubePreviewAuthor"></span>
          </div>
        </div>
      </div>
      <div class="media-type-panel" id="externalMediaFields" data-media-panel="link">
        <div class="form-field-group">
          <label for="pub_external_url">Cole o link completo</label>
          <input type="url" id="pub_external_url" name="external_url" value="${mediaEditorType === "link" ? escapeHtml(item.url || "") : ""}">
        </div>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_category">Categoria (opcional)</label>
          <input type="text" id="pub_category" name="category" value="${escapeHtml(item.category || '')}">
        </div>
        <div class="form-field-group">
          <label for="pub_sort_order">Posição no site</label>
          <input type="number" id="pub_sort_order" name="sort_order" value="${item.sort_order ?? 0}">
          <span class="field-help">Use 0 para aparecer primeiro.</span>
        </div>
      </div>
    `;
  } else if (isTestimonial) {
    specificFields = `
      <div class="form-field-group">
        <label for="pub_author_name">Nome da pessoa *</label>
        <input type="text" id="pub_author_name" name="author_name" value="${escapeHtml(item.author_name || '')}" required>
      </div>
      <div class="form-field-group">
        <label for="pub_quote">Depoimento *</label>
        <textarea id="pub_quote" name="quote" rows="5" required>${escapeHtml(item.quote || '')}</textarea>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_author_label">Identificação</label>
          <input type="text" id="pub_author_label" name="author_label" value="${escapeHtml(item.author_label || '')}" placeholder="Ex.: Doadora cadastrada">
        </div>
        <div class="form-field-group">
          <label for="pub_sort_order">Ordem de exibição</label>
          <input type="number" id="pub_sort_order" name="sort_order" value="${item.sort_order ?? 0}">
        </div>
      </div>
    `;
  } else if (isTeam) {
    specificFields = `
      <div class="form-field-group">
        <label for="pub_name">Nome *</label>
        <input type="text" id="pub_name" name="name" value="${escapeHtml(item.name || '')}" required>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_role">Função</label>
          <input type="text" id="pub_role" name="role" value="${escapeHtml(item.role || '')}">
        </div>
        <div class="form-field-group">
          <label for="pub_member_type">Tipo de participação</label>
          <select id="pub_member_type" name="member_type">
            <option value="equipe" ${item.member_type === "equipe" ? "selected" : ""}>Equipe</option>
            <option value="embaixador" ${item.member_type === "embaixador" ? "selected" : ""}>Embaixador(a)</option>
            <option value="voluntario" ${item.member_type === "voluntario" ? "selected" : ""}>Voluntário(a)</option>
          </select>
        </div>
      </div>
      <div class="form-field-group">
        <label for="pub_description">Apresentação</label>
        <textarea id="pub_description" name="description" rows="4">${escapeHtml(item.description || '')}</textarea>
      </div>
      <div class="form-field-group">
        <label for="pub_sort_order">Ordem de exibição</label>
        <input type="number" id="pub_sort_order" name="sort_order" value="${item.sort_order ?? 0}">
      </div>
    `;
  } else if (isFaq) {
    specificFields = `
      <div class="form-field-group">
        <label for="pub_question">Pergunta *</label>
        <input type="text" id="pub_question" name="question" value="${escapeHtml(item.question || '')}" required>
      </div>
      <div class="form-field-group">
        <label for="pub_answer">Resposta *</label>
        <textarea id="pub_answer" name="answer" rows="7" required>${escapeHtml(item.answer || '')}</textarea>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_category">Categoria</label>
          <input type="text" id="pub_category" name="category" value="${escapeHtml(item.category || '')}">
        </div>
        <div class="form-field-group">
          <label for="pub_sort_order">Ordem de exibição</label>
          <input type="number" id="pub_sort_order" name="sort_order" value="${item.sort_order ?? 0}">
        </div>
      </div>
    `;
  } else if (isMetric) {
    specificFields = `
      <div class="form-field-group">
        <label for="pub_label">Nome do indicador *</label>
        <input type="text" id="pub_label" name="label" value="${escapeHtml(item.label || '')}" required>
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_key">Chave técnica *</label>
          <input type="text" id="pub_key" name="key" value="${escapeHtml(item.key || '')}" placeholder="Ex.: doadores_cadastrados" required>
        </div>
        <div class="form-field-group">
          <label for="pub_value">Valor *</label>
          <input type="number" id="pub_value" name="value" value="${item.value ?? 0}" step="any" required>
        </div>
      </div>
      <div class="form-field-group">
        <label for="pub_description">Descrição curta</label>
        <input type="text" id="pub_description" name="description" value="${escapeHtml(item.description || '')}" placeholder="Ex.: pessoas adicionadas à rede">
      </div>
      <div class="form-field-row">
        <div class="form-field-group">
          <label for="pub_mode">Formato</label>
          <select id="pub_mode" name="mode">
            <option value="number" ${item.mode !== "percentage" ? "selected" : ""}>Número</option>
            <option value="percentage" ${item.mode === "percentage" ? "selected" : ""}>Percentual</option>
          </select>
        </div>
        <div class="form-field-group">
          <label for="pub_sort_order">Ordem de exibição</label>
          <input type="number" id="pub_sort_order" name="sort_order" value="${item.sort_order ?? 0}">
        </div>
      </div>
    `;
  }

  const showImageWidget = config.supportsImage && (!isMedia || mediaEditorType === "image");
  const hasMedia = showImageWidget && Boolean(publicationState.selectedAsset || item.image_url || item.thumbnail_url);
  const mediaUrl = safeHttpUrl(getPreferredAssetUrl(publicationState.selectedAsset) || item.image_url || item.thumbnail_url);

  return `
    <div class="form-grid">
      <div class="form-columns-main">
        ${specificFields}
      </div>

      <div class="form-columns-sidebar" id="imageEditorSidebar" ${showImageWidget ? "" : "hidden"}>
        <div class="media-box-widget">
          <span class="widget-label">Imagem da publicação</span>

          <div class="media-preview-box" id="formMediaPreviewBox" style="${hasMedia ? 'display:flex;' : 'display:none;'}">
            <img src="${escapeHtml(mediaUrl)}" alt="Visualização" id="formMediaPreviewImg">
            <div class="media-preview-details" id="formMediaDetails"></div>
          </div>

          <div class="media-no-preview" id="formNoMediaBox" style="${!hasMedia ? 'display:flex;' : 'display:none;'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-up"><path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10"/><circle cx="9" cy="9" r="2"/><path d="m14 13.5 1.79 1.79a2 2 0 0 0 2.82 0L21 13"/><path d="M16 19h6"/><path d="M19 16v6"/></svg>
            <p>Nenhuma imagem escolhida</p>
            <small>Use uma das opções abaixo.</small>
          </div>

          <div class="media-widget-actions">
            <button type="button" class="media-choice-button is-primary" id="btnOpenCloudinaryWidget">
              <strong id="btnOpenCloudinaryWidgetLabel">${publicationState.selectedAsset ? "Trocar por uma nova imagem" : "Enviar nova imagem"}</strong>
              <span>Escolha um arquivo do computador ou arraste para a janela.</span>
            </button>
            <button type="button" class="media-choice-button" id="btnOpenMediaPicker">
              <strong>Usar imagem já enviada</strong>
              <span>Abre a galeria de imagens que já estão no sistema.</span>
            </button>
            <label class="media-fallback-upload" id="legacyDirectUploadLabel" hidden>
              <input type="file" id="formDirectFileInput" accept="image/jpeg,image/png,image/webp" style="display:none;">
              <span id="formDirectUploadSpan">Se a janela não abrir, escolha o arquivo aqui</span>
            </label>
            <button type="button" class="action-button ghost danger-text compact-btn" id="btnRemoveMediaAsset">Remover imagem escolhida</button>
            <button type="button" class="action-button secondary compact-btn" id="btnRetryMediaRegistration" hidden>Tentar registrar novamente</button>
          </div>
        </div>

        <div class="form-field-group" style="margin-top: 16px;">
          <label for="pub_image_alt">Descreva a imagem em uma frase</label>
          <input type="text" id="pub_image_alt" name="image_alt" value="${escapeHtml(item.image_alt || '')}" placeholder="Ex.: Voluntários reunidos durante uma ação">
          <span class="field-help">Essa descrição ajuda pessoas que usam leitor de tela.</span>
        </div>
      </div>
    </div>
  `;
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function buildFormFieldsMarkup(item) {
  const config = getPublicationConfig(publicationState.activeType);
  const legacyMarkup = buildLegacyFormFieldsMarkup(item);
  const mediaUrl = safeHttpUrl(
    getPreferredAssetUrl(publicationState.selectedAsset)
      || item.image_url
      || item.thumbnail_url,
  );
  const category = item.category || item.action_status || "FlaMedula";
  const description = item.subtitle || item.summary || item.description || item.quote || item.answer || "O resumo do conteúdo aparecerá nesta área.";

  return `
    <div class="publication-wizard">
      <section class="publication-wizard-step" data-wizard-step="1">
        <div class="wizard-step-heading">
          <span>Etapa 1 de 3</span>
          <h3>Escreva as informações</h3>
          <p>Preencha o título e os demais campos. Depois, clique em “Ir para a imagem”.</p>
        </div>
        <div id="wizardLegacyFormMount">${legacyMarkup}</div>
      </section>

      <section class="publication-wizard-step" data-wizard-step="2" hidden>
        <div class="wizard-step-heading">
          <span>Etapa 2 de 3</span>
          <h3 id="wizardMediaTitle">Escolha uma imagem</h3>
          <p id="wizardMediaDescription">Envie uma imagem nova ou escolha uma imagem que já está no sistema.</p>
        </div>
        <div id="wizardMediaMount" class="wizard-media-mount">
          <div class="wizard-guidance-card" id="wizardMediaGuidance">
            <strong id="wizardMediaGuidanceTitle">O que fazer nesta etapa</strong>
            <span id="wizardMediaGuidanceText">Escolha uma das duas opções ao lado. Quando a imagem aparecer na prévia, clique em “Revisar publicação”.</span>
          </div>
        </div>
      </section>

      <section class="publication-wizard-step" data-wizard-step="3" hidden>
        <div class="wizard-step-heading">
          <span>Etapa 3 de 3</span>
          <h3>Confira antes de publicar</h3>
          <p>Veja se o texto e a imagem estão corretos. Depois escolha uma das opções no final da tela.</p>
        </div>
        <div class="publication-review-layout">
          <div>
            <div class="preview-toolbar" role="group" aria-label="Tamanho da prévia">
              <button type="button" class="preview-device-button is-active" data-preview-device="desktop">Desktop</button>
              <button type="button" class="preview-device-button" data-preview-device="mobile">Celular</button>
            </div>
            <article class="publication-live-preview" id="publicationLivePreview" data-device="desktop">
              <div class="publication-live-preview-media">
                <img id="publicationPreviewImage" src="${escapeHtml(mediaUrl)}" alt="" ${mediaUrl ? "" : "hidden"}>
                <span id="publicationPreviewMediaEmpty" ${mediaUrl ? "hidden" : ""}>Prévia sem imagem</span>
              </div>
              <div class="publication-live-preview-copy">
                <span id="publicationPreviewCategory">${escapeHtml(category)}</span>
                <h4 id="publicationPreviewTitle">${escapeHtml(item[config.titleField] || "Seu título aparecerá aqui")}</h4>
                <p id="publicationPreviewDescription">${escapeHtml(description)}</p>
                <span class="publication-preview-cta" id="publicationPreviewCta">${escapeHtml(item.cta_label || "Falar no WhatsApp")}</span>
              </div>
            </article>
          </div>

          <aside class="publication-schedule-card">
            <h4>Publicar em outra data (opcional)</h4>
            <p>Preencha somente se quiser que a publicação entre ou saia do site automaticamente.</p>
            <div class="form-field-group">
              <label for="pub_scheduled_for">Começar a publicar em</label>
              <input type="datetime-local" id="pub_scheduled_for" name="scheduled_for" value="${escapeHtml(toDateTimeLocal(item.scheduled_for))}">
            </div>
            <div class="form-field-group">
              <label for="pub_expires_at">Retirar do site em</label>
              <input type="datetime-local" id="pub_expires_at" name="expires_at" value="${escapeHtml(toDateTimeLocal(item.expires_at))}">
            </div>
            <div class="wizard-autosave-status" id="publicationAutosaveStatus" role="status">Alterações protegidas nesta sessão.</div>
          </aside>
        </div>
      </section>
    </div>
  `;
}

let autosaveTimeout = null;

function getDraftStorageKey() {
  const recordKey = publicationState.editingId || "new";
  return `flamedula:publication-draft:${publicationState.activeType}:${recordKey}`;
}

function setAutosaveStatus(message) {
  const node = document.getElementById("publicationAutosaveStatus");
  if (node) node.textContent = message;
}

function saveDraftToSession(form) {
  try {
    const values = Object.fromEntries(new FormData(form).entries());
    sessionStorage.setItem(getDraftStorageKey(), JSON.stringify({
      values,
      savedAt: new Date().toISOString(),
    }));
    setAutosaveStatus("Alterações protegidas nesta sessão.");
  } catch {
    setAutosaveStatus("Não foi possível proteger o rascunho localmente.");
  }
}

function scheduleDraftAutosave(form) {
  clearTimeout(autosaveTimeout);
  setAutosaveStatus("Salvando alterações...");
  autosaveTimeout = setTimeout(() => saveDraftToSession(form), 450);
}

function restoreDraftFromSession(form) {
  try {
    const raw = sessionStorage.getItem(getDraftStorageKey());
    if (!raw) return;
    const draft = JSON.parse(raw);
    Object.entries(draft.values || {}).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (!field || field.readOnly || typeof value !== "string") return;
      field.value = value;
    });
    const time = draft.savedAt
      ? new Date(draft.savedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "agora";
    setAutosaveStatus(`Rascunho desta sessão recuperado (${time}).`);
  } catch {
    sessionStorage.removeItem(getDraftStorageKey());
  }
}

function clearDraftFromSession() {
  clearTimeout(autosaveTimeout);
  sessionStorage.removeItem(getDraftStorageKey());
}

function prepareWizardMediaStep() {
  const mount = document.getElementById("wizardMediaMount");
  const legacyMount = document.getElementById("wizardLegacyFormMount");
  if (!mount || !legacyMount) return;

  legacyMount.querySelectorAll(".media-type-panel").forEach((panel) => mount.appendChild(panel));
  const sidebar = legacyMount.querySelector(".form-columns-sidebar");
  if (sidebar) mount.appendChild(sidebar);
}

function validateWizardContent(form) {
  const titleField = getPublicationConfig(publicationState.activeType).titleField;
  const title = form.querySelector(`[name='${titleField}']`);
  if (!title?.value.trim()) {
    title?.setCustomValidity("Informe um título para continuar.");
    title?.reportValidity();
    title?.focus();
    return false;
  }
  title.setCustomValidity("");
  return true;
}

function validateWizardMedia(form) {
  if (isPublicationUploadBusy()) {
    showToast("Aguarde o envio da imagem terminar.", "error");
    return false;
  }

  if (publicationState.pendingMediaRegistration) {
    showToast("Conclua o registro da imagem antes de continuar.", "error");
    document.getElementById("btnRetryMediaRegistration")?.focus();
    return false;
  }

  if (publicationState.activeType !== "media_items") return true;

  const mediaType = getSelectedMediaType();
  if (mediaType === "image") {
    const hasImage = Boolean(
      publicationState.selectedAsset
      || (!publicationState.mediaRemoved && (
        publicationState.formData?.image_asset_id
        || publicationState.formData?.image_url
      ))
    );
    if (!hasImage) {
      setPublicationUploadStatus("error", "Escolha uma imagem para continuar.");
      showToast("Escolha uma imagem nova ou uma imagem da galeria.", "error");
      document.getElementById("btnOpenCloudinaryWidget")?.focus();
      return false;
    }
  }

  if (mediaType === "youtube") {
    const youtubeInput = form.querySelector("[name='url']");
    if (!buildYouTubeMetadataFallback(youtubeInput?.value || "")) {
      youtubeInput?.setCustomValidity("Cole o link completo de um vídeo do YouTube.");
      youtubeInput?.reportValidity();
      youtubeInput?.focus();
      return false;
    }
    youtubeInput?.setCustomValidity("");
  }

  if (mediaType === "link") {
    const linkInput = form.querySelector("[name='external_url']");
    if (!/^https?:\/\//i.test(linkInput?.value?.trim() || "")) {
      linkInput?.setCustomValidity("Cole um link completo começando com https://");
      linkInput?.reportValidity();
      linkInput?.focus();
      return false;
    }
    linkInput?.setCustomValidity("");
  }

  return true;
}

function getPreviewImageUrl(form) {
  const mediaType = form.querySelector("[name='type']")?.value;
  if (mediaType === "youtube") {
    return safeHttpUrl(form.querySelector("[name='thumbnail_url']")?.value);
  }
  const previewImage = document.getElementById("formMediaPreviewImg");
  return safeHttpUrl(previewImage?.src || publicationState.formData?.image_url || publicationState.formData?.thumbnail_url);
}

function updatePublicationPreview(form) {
  const titleField = getPublicationConfig(publicationState.activeType).titleField;
  const title = form.querySelector(`[name='${titleField}']`)?.value.trim() || "Seu título aparecerá aqui";
  const description = form.querySelector("[name='subtitle']")?.value.trim()
    || form.querySelector("[name='summary']")?.value.trim()
    || form.querySelector("[name='description']")?.value.trim()
    || form.querySelector("[name='quote']")?.value.trim()
    || form.querySelector("[name='answer']")?.value.trim()
    || "O resumo do conteúdo aparecerá nesta área.";
  const category = form.querySelector("[name='category']")?.value.trim()
    || form.querySelector("[name='action_status']")?.value.trim()
    || "FlaMedula";
  const cta = form.querySelector("[name='cta_label']")?.value.trim() || "Falar no WhatsApp";
  const imageUrl = getPreviewImageUrl(form);
  const image = document.getElementById("publicationPreviewImage");
  const empty = document.getElementById("publicationPreviewMediaEmpty");

  document.getElementById("publicationPreviewTitle").textContent = title;
  document.getElementById("publicationPreviewDescription").textContent = description;
  document.getElementById("publicationPreviewCategory").textContent = category;
  document.getElementById("publicationPreviewCta").textContent = cta;

  if (image) {
    image.hidden = !imageUrl;
    image.src = imageUrl || "";
    image.alt = form.querySelector("[name='image_alt']")?.value.trim() || "Prévia da publicação";
  }
  if (empty) empty.hidden = Boolean(imageUrl);
}

function setWizardStep(step, form, { validate = true } = {}) {
  const requestedStep = Math.min(Math.max(Number(step) || 1, 1), 3);
  const currentStep = publicationState.wizardStep;
  const nextStep = requestedStep > currentStep
    ? Math.min(requestedStep, currentStep + 1)
    : requestedStep;

  if (validate && nextStep > currentStep) {
    if (currentStep === 1 && !validateWizardContent(form)) return;
    if (currentStep === 2 && !validateWizardMedia(form)) return;
  }

  publicationState.wizardStep = nextStep;
  form.querySelectorAll("[data-wizard-step]").forEach((section) => {
    section.hidden = Number(section.dataset.wizardStep) !== nextStep;
  });
  document.querySelectorAll("[data-wizard-go]").forEach((button) => {
    const buttonStep = Number(button.dataset.wizardGo);
    button.classList.toggle("is-active", buttonStep === nextStep);
    button.classList.toggle("is-complete", buttonStep < nextStep);
    button.setAttribute("aria-current", buttonStep === nextStep ? "step" : "false");
  });

  const backButton = document.getElementById("btnWizardBack");
  const nextButton = document.getElementById("btnWizardNext");
  const saveButtons = document.querySelectorAll(".wizard-save-action");
  if (backButton) backButton.hidden = nextStep === 1;
  if (nextButton) {
    nextButton.hidden = nextStep === 3;
    nextButton.textContent = nextStep === 1 ? getStepOneNextLabel() : "Revisar publicação";
  }
  saveButtons.forEach((button) => { button.hidden = nextStep !== 3; });

  if (nextStep === 3) updatePublicationPreview(form);
  document.getElementById("editorialModalBody")?.scrollTo({ top: 0, behavior: "smooth" });
}

function bindPublicationWizard(form) {
  prepareWizardMediaStep();
  restoreDraftFromSession(form);
  syncMediaTypePanels();
  setWizardStep(1, form, { validate: false });

  const backButton = document.getElementById("btnWizardBack");
  const nextButton = document.getElementById("btnWizardNext");
  if (backButton) backButton.onclick = () => {
    setWizardStep(publicationState.wizardStep - 1, form, { validate: false });
  };
  if (nextButton) nextButton.onclick = () => {
    setWizardStep(publicationState.wizardStep + 1, form);
  };
  document.querySelectorAll("[data-wizard-go]").forEach((button) => {
    button.onclick = () => setWizardStep(button.dataset.wizardGo, form);
  });
  document.querySelectorAll("[data-preview-device]").forEach((button) => {
    button.addEventListener("click", () => {
      const device = button.dataset.previewDevice;
      document.getElementById("publicationLivePreview")?.setAttribute("data-device", device);
      document.querySelectorAll("[data-preview-device]").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
    });
  });

  if (form.dataset.wizardFormBound !== "true") {
    form.dataset.wizardFormBound = "true";
    form.addEventListener("input", () => {
      scheduleDraftAutosave(form);
      if (publicationState.wizardStep === 3) updatePublicationPreview(form);
    });
    form.addEventListener("change", () => {
      scheduleDraftAutosave(form);
      if (publicationState.wizardStep === 3) updatePublicationPreview(form);
    });
  }
}

export function bindFormSubmitEvent() {
  const form = document.getElementById("editorialModalForm");
  if (!form) return;
  bindPublicationWizard(form);
  if (form.dataset.submitBound === "true") return;
  form.dataset.submitBound = "true";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mode = e.submitter?.id === "btnSavePublish"
      ? "publish"
      : e.submitter?.id === "btnSaveSchedule"
        ? "schedule"
        : "draft";
    await handleSaveForm(mode);
  });
}

async function handleSaveForm(mode) {
  const form = document.getElementById("editorialModalForm");
  if (!form) return;
  if (publicationState.saving || isPublicationUploadBusy()) {
    showToast("Aguarde o envio da imagem terminar antes de salvar.", "error");
    return;
  }
  if (publicationState.pendingMediaRegistration) {
    setPublicationSaveStatus("error", "Registre a imagem no painel antes de salvar.");
    showToast("Imagem enviada, mas ainda nao registrada no painel.", "error");
    return;
  }

  setPublicationSaveStatus("validating");
  const config = getPublicationConfig(publicationState.activeType);
  const titleInput = form.querySelector(`[name='${config.titleField}']`);
  if (!titleInput || !titleInput.value.trim()) {
    setPublicationSaveStatus("error", "O titulo e obrigatorio.");
    showToast("O titulo e obrigatorio.", "error");
    titleInput?.focus();
    return;
  }

  const scheduledInput = form.querySelector("[name='scheduled_for']");
  const expiresInput = form.querySelector("[name='expires_at']");
  const scheduledDate = scheduledInput?.value ? new Date(scheduledInput.value) : null;
  const expiresDate = expiresInput?.value ? new Date(expiresInput.value) : null;

  if (mode === "schedule" && (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date())) {
    setPublicationSaveStatus("error", "Escolha uma data futura para agendar.");
    showToast("Escolha uma data futura para agendar.", "error");
    setWizardStep(3, form, { validate: false });
    scheduledInput?.focus();
    return;
  }

  const effectiveStart = mode === "schedule" ? scheduledDate : new Date();
  if (expiresDate && (Number.isNaN(expiresDate.getTime()) || (mode !== "draft" && expiresDate <= effectiveStart))) {
    setPublicationSaveStatus("error", "A retirada deve acontecer depois da publicação.");
    showToast("A retirada deve acontecer depois da publicação.", "error");
    setWizardStep(3, form, { validate: false });
    expiresInput?.focus();
    return;
  }

  const isPublish = mode !== "draft";

  const payload = {
    [config.titleField]: titleInput.value.trim(),
    sort_order: Number(form.querySelector("[name='sort_order']")?.value || 0),
    published: isPublish,
    scheduled_for: mode === "publish" ? null : (scheduledDate?.toISOString() || null),
    expires_at: expiresDate?.toISOString() || null
  };
  if (config.supportsImage) {
    payload.image_alt = form.querySelector("[name='image_alt']")?.value || null;
  }

  const activeType = publicationState.activeType;
  if (activeType === "hero_news") {
    payload.subtitle = form.querySelector("[name='subtitle']")?.value || null;
    payload.category = form.querySelector("[name='category']")?.value || null;
    payload.cta_label = form.querySelector("[name='cta_label']")?.value || null;
    payload.cta_url = getOfficialWhatsAppUrl();
  } else if (activeType === "actions") {
    payload.summary = form.querySelector("[name='summary']")?.value || null;
    payload.action_date = form.querySelector("[name='action_date']")?.value || null;
    payload.location = form.querySelector("[name='location']")?.value || null;
    payload.action_status = form.querySelector("[name='action_status']")?.value || null;
    payload.cta_label = form.querySelector("[name='cta_label']")?.value || null;
    payload.cta_url = getOfficialWhatsAppUrl();
  } else if (activeType === "media_items") {
    const mediaType = getSelectedMediaType();
    payload.description = form.querySelector("[name='description']")?.value || null;
    payload.category = form.querySelector("[name='category']")?.value || null;
    payload.type = mediaType === "image" ? "card" : mediaType;

    if (mediaType === "youtube") {
      const fallback = buildYouTubeMetadataFallback(form.querySelector("[name='url']")?.value || "");
      if (!fallback) {
        setPublicationSaveStatus("error", "Cole uma URL valida do YouTube.");
        showToast("Cole uma URL valida do YouTube.", "error");
        return;
      }
      payload.url = fallback.canonicalUrl;
      payload.youtube_id = form.querySelector("[name='youtube_id']")?.value || fallback.videoId;
      payload.thumbnail_url = form.querySelector("[name='thumbnail_url']")?.value || fallback.thumbnailUrl;
      payload.image_asset_id = null;
      payload.image_url = null;
      payload.cloudinary_public_id = null;
    } else if (mediaType === "link") {
      payload.url = form.querySelector("[name='external_url']")?.value || null;
      payload.youtube_id = null;
      payload.thumbnail_url = null;
      payload.image_asset_id = null;
      payload.image_url = null;
      payload.cloudinary_public_id = null;
    } else {
      const hasExistingImage = Boolean(publicationState.formData?.image_asset_id || publicationState.formData?.image_url);
      if (!publicationState.selectedAsset && !hasExistingImage) {
        setPublicationSaveStatus("error", "Selecione uma imagem antes de salvar.");
        showToast("Selecione uma imagem antes de salvar.", "error");
        return;
      }
      payload.url = null;
      payload.youtube_id = null;
      if (publicationState.selectedAsset) payload.thumbnail_url = null;
    }
  } else if (activeType === "testimonials") {
    payload.quote = form.querySelector("[name='quote']")?.value.trim() || null;
    payload.author_label = form.querySelector("[name='author_label']")?.value.trim() || null;
    if (!payload.quote) {
      setPublicationSaveStatus("error", "Escreva o depoimento antes de continuar.");
      showToast("Escreva o depoimento antes de continuar.", "error");
      setWizardStep(1, form, { validate: false });
      form.querySelector("[name='quote']")?.focus();
      return;
    }
  } else if (activeType === "team_members") {
    payload.role = form.querySelector("[name='role']")?.value.trim() || null;
    payload.description = form.querySelector("[name='description']")?.value.trim() || null;
    payload.member_type = form.querySelector("[name='member_type']")?.value || "equipe";
  } else if (activeType === "faq_items") {
    payload.answer = form.querySelector("[name='answer']")?.value.trim() || null;
    payload.category = form.querySelector("[name='category']")?.value.trim() || null;
    if (!payload.answer) {
      setPublicationSaveStatus("error", "Escreva a resposta antes de continuar.");
      showToast("Escreva a resposta antes de continuar.", "error");
      setWizardStep(1, form, { validate: false });
      form.querySelector("[name='answer']")?.focus();
      return;
    }
  } else if (activeType === "transparency_metrics") {
    const metricValue = Number(form.querySelector("[name='value']")?.value);
    payload.key = form.querySelector("[name='key']")?.value.trim() || null;
    payload.value = Number.isFinite(metricValue) ? metricValue : null;
    payload.description = form.querySelector("[name='description']")?.value.trim() || null;
    payload.mode = form.querySelector("[name='mode']")?.value || "number";
    if (!payload.key || payload.value === null) {
      setPublicationSaveStatus("error", "Informe a chave e um valor válido para o indicador.");
      showToast("Informe a chave e um valor válido para o indicador.", "error");
      setWizardStep(1, form, { validate: false });
      return;
    }
  }

  // Associar imagem do Cloudinary
  if (config.supportsImage && publicationState.selectedAsset && (activeType !== "media_items" || getSelectedMediaType() === "image")) {
    applyAssetToPayload(payload, publicationState.selectedAsset, activeType);
  } else if (config.supportsImage) {
    // Se removeu a imagem
    const previewBox = document.getElementById("formMediaPreviewBox");
    if (previewBox && previewBox.style.display === "none") {
      payload.image_asset_id = null;
      payload.image_url = null;
      payload.cloudinary_public_id = null;
      if (activeType === "media_items") payload.thumbnail_url = null;
    }
  }

  const finalPayload = activeType === "media_items"
    ? normalizeMediaItemPayload(payload)
    : payload;

  const table = getTableFromType(activeType);
  publicationState.saving = true;
  setPublicationSaveStatus("saving");
  syncPublicationUploadControls();

  try {
    let savedRecord;
    if (publicationState.editorMode === "edit") {
      savedRecord = await updatePublicationItem(table, publicationState.editingId, finalPayload);
    } else {
      savedRecord = await createPublicationItem(table, finalPayload);
    }

    if (!savedRecord?.id) {
      throw new Error("Supabase nao confirmou o registro salvo.");
    }

    const successMessage = getSaveSuccessMessage(mode);
    setPublicationSaveStatus("saved", successMessage);
    showToast(successMessage);
    clearDraftFromSession();
    await loadItems();
    publicationState.saving = false;
    syncPublicationUploadControls();
    await wait(900);
    closePublicationModal();
  } catch (err) {
    reportOperationalFailure({
      source: "admin_editor",
      eventType: "publication_failed",
      error: err,
      metadata: { content_type: activeType, step: mode }
    });
    console.error(err);
    setPublicationSaveStatus("error", "Nao foi possivel salvar. Seus dados continuam aqui.");
    showToast(err.message || "Nao foi possivel salvar. Seus dados continuam aqui.", "error");
  } finally {
    publicationState.saving = false;
    syncPublicationUploadControls();
  }
}

function getSaveSuccessMessage(mode) {
  if (mode === "schedule") return "Conteúdo agendado com sucesso";
  if (mode === "publish") return publicationState.editorMode === "edit"
    ? "Alterações publicadas com sucesso"
    : "Conteúdo publicado com sucesso";
  return publicationState.editorMode === "edit"
    ? "Alterações salvas como rascunho"
    : "Rascunho salvo com sucesso";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleDeleteItem(id) {
  if (publicationState.role !== "owner") {
    showToast("Permissão negada. Apenas administradores 'owner' podem excluir conteúdos.", "error");
    return;
  }

  if (!confirm("Tem certeza que deseja excluir permanentemente este registro? As mídias associadas não serão apagadas do Cloudinary.")) {
    return;
  }

  const table = getTableFromType(publicationState.activeType);
  try {
    await deletePublicationItem(table, id);
    showToast("Registro excluído com sucesso!");
    await loadItems();
  } catch (err) {
    reportOperationalFailure({
      source: "admin_editor",
      eventType: "publication_failed",
      error: err,
      metadata: { content_type: publicationState.activeType, step: "delete" }
    });
    console.error(err);
    showToast(err.message || "Erro ao excluir o registro.", "error");
  }
}

async function handleTogglePublish(id, currentlyPublished) {
  const table = getTableFromType(publicationState.activeType);
  const newStatus = !currentlyPublished;

  try {
    await updatePublicationItem(table, id, {
      published: newStatus,
      ...(newStatus ? { scheduled_for: null } : {})
    });
    showToast(newStatus ? "Registro publicado com sucesso!" : "Registro revertido para rascunho!");
    await loadItems();
  } catch (err) {
    reportOperationalFailure({
      source: "admin_editor",
      eventType: "publication_failed",
      error: err,
      metadata: { content_type: publicationState.activeType, step: "toggle_publish" }
    });
    console.error(err);
    showToast(err.message || "Erro ao alterar status de publicação.", "error");
  }
}
