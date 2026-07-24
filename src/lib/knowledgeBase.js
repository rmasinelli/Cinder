import { supabase } from "./supabase.js";

const ARTICLE_COLUMNS = "id, slug, title, course_id, category, status, author_id, reviewer_id, body, tags, review_notes, source_type, source_id, created_at, updated_at, submitted_at, published_at";

function toAppArticle(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    courseId: row.course_id || "",
    category: row.category || "General",
    status: row.status,
    authorId: row.author_id,
    reviewerId: row.reviewer_id,
    body: row.body || "",
    tags: row.tags || [],
    reviewNotes: row.review_notes || "",
    sourceType: row.source_type,
    sourceId: row.source_id,
    created: row.created_at,
    updated: row.updated_at,
    submittedAt: row.submitted_at,
    publishedAt: row.published_at,
  };
}

function slugify(value) {
  const base = value.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "article";
  return `${base}-${Date.now().toString(36)}`;
}

function normalizeTags(tags = []) {
  return [...new Set(tags
    .map(tag => tag.trim().toLowerCase())
    .filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function toDatabaseArticle(article, userId) {
  const now = new Date().toISOString();
  return {
    ...(article.id && !String(article.id).startsWith("kb-") ? { id: article.id } : {}),
    slug: article.slug || slugify(article.title),
    title: article.title.trim(),
    course_id: article.courseId || null,
    category: article.category || "General",
    status: article.status || "draft",
    author_id: article.authorId || userId,
    reviewer_id: article.reviewerId || null,
    body: article.body,
    tags: normalizeTags(article.tags),
    review_notes: article.reviewNotes || null,
    source_type: article.sourceType || null,
    source_id: article.sourceId || null,
    submitted_at: article.status === "submitted" ? (article.submittedAt || now) : article.submittedAt || null,
    published_at: article.status === "published" ? (article.publishedAt || now) : article.publishedAt || null,
  };
}

export async function listKnowledgeArticles() {
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select(ARTICLE_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(toAppArticle);
}

export async function saveKnowledgeArticle(article, userId, changeSummary = "Article updated") {
  const record = toDatabaseArticle(article, userId);
  const query = article.id && !String(article.id).startsWith("kb-")
    ? supabase.from("knowledge_articles").update(record).eq("id", article.id)
    : supabase.from("knowledge_articles").insert(record);
  const { data, error } = await query.select(ARTICLE_COLUMNS).single();
  if (error) throw error;

  const { error: revisionError } = await supabase.from("knowledge_article_revisions").insert({
    article_id: data.id,
    editor_id: userId,
    title: data.title,
    body: data.body,
    tags: data.tags,
    status: data.status,
    change_summary: changeSummary,
  });
  if (revisionError) throw revisionError;
  return toAppArticle(data);
}

export async function deleteKnowledgeArticle(id) {
  const { error } = await supabase.from("knowledge_articles").delete().eq("id", id);
  if (error) throw error;
}
