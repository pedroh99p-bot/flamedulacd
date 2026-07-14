import { fetchTablePage, insertRecord, updateRecord, deleteRecord } from "./supabaseService.js";

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
