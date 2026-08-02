import {
  fetchTablePage,
  insertRecord,
  updateRecord,
  deleteRecord
} from "./supabaseService.js";
import { supabaseClient } from "../supabaseClient.js";

const PUBLIC_VIEWS = {
  hero_news: "v_public_hero_news",
  actions: "v_public_actions",
  media_items: "v_public_media_items",
  testimonials: "v_public_testimonials",
  team_members: "v_public_team_members",
  faq_items: "v_public_faq_items",
  transparency_metrics: "v_public_transparency_metrics"
};

export async function listPublicationItems(tableName, options = {}) {
  const page = options.page || 1;
  const pageSize = options.pageSize || 10;
  return fetchTablePage(tableName, {
    page,
    pageSize,
    orderBy: "sort_order",
    ascending: true,
    filters: options.filters || {}
  });
}

export async function createPublicationItem(tableName, payload) {
  return insertRecord(tableName, payload, `Não foi possível criar registro em ${tableName}.`);
}

export async function updatePublicationItem(tableName, id, payload) {
  return updateRecord(tableName, id, payload, `Não foi possível atualizar o registro em ${tableName}.`);
}

export async function deletePublicationItem(tableName, id) {
  return deleteRecord(tableName, id, `Não foi possível excluir o registro em ${tableName}.`);
}

export async function verifyPublicationIsPublic(tableName, id, options = {}) {
  const viewName = PUBLIC_VIEWS[tableName];
  if (!viewName) return { visible: true, row: null };

  const attempts = Math.max(Number(options.attempts) || 3, 1);
  const delayMs = Math.max(Number(options.delayMs) || 250, 0);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const { data, error } = await supabaseClient
      .from(viewName)
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return { visible: false, row: null, error };
    }

    if (data?.id) {
      return { visible: true, row: data, error: null };
    }

    if (attempt < attempts && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { visible: false, row: null, error: null };
}
