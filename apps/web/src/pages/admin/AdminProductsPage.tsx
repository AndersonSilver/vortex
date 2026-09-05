import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ProductCategoryDTO, ProductDTO, ProductBadge } from "@vortex/shared";
import {
  useCreateProduct,
  useDeactivateProduct,
  useProducts,
  useToggleProductActive,
  useUpdateProduct,
} from "../../hooks/useProducts";
import {
  useCreateProductCategory,
  useDeleteProductCategory,
  useProductCategories,
  useUpdateProductCategory,
} from "../../hooks/useProductCategories";
import { useFilaments } from "../../hooks/useFilaments";
import { useUploadProductImage, useUploadProductVideo } from "../../hooks/useMedia";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

const MATERIAL_OPTIONS = ["PLA", "PETG", "ABS", "Resina", "Nylon", "TPU", "Conforme projeto"];
const MAX_PRODUCT_IMAGES = 5;

type Tab = "products" | "categories";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "products", label: "Produtos" },
  { key: "categories", label: "Categorias" },
];

interface CategoryFormState {
  name: string;
  emoji: string;
  sortOrder: string;
  active: boolean;
}

const EMPTY_CATEGORY_FORM: CategoryFormState = { name: "", emoji: "📦", sortOrder: "0", active: true };

interface ProductFormState {
  name: string;
  sku: string;
  marketplaceAliases: string;
  category: string;
  price: string;
  oldPrice: string;
  emoji: string;
  badge: ProductBadge | "";
  description: string;
  material: string;
  images: string[];
  videoUrl: string | null;
  filamentId: string;
  weightGrams: string;
  printTimeMinutes: string;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  sku: "",
  marketplaceAliases: "",
  category: "",
  price: "",
  oldPrice: "",
  emoji: "📦",
  badge: "",
  description: "",
  material: MATERIAL_OPTIONS[0],
  images: [],
  videoUrl: null,
  filamentId: "",
  weightGrams: "",
  printTimeMinutes: "",
};

export function AdminProductsPage() {
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useProducts("all", true);
  const { data: categories = [] } = useProductCategories(true);
  const { data: filaments = [] } = useFilaments();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deactivateProduct = useDeactivateProduct();
  const toggleActive = useToggleProductActive();
  const uploadImage = useUploadProductImage();
  const uploadVideo = useUploadProductVideo();
  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();
  const deleteCategory = useDeleteProductCategory();
  const { showToast } = useToast();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("products");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategoryDTO | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(EMPTY_CATEGORY_FORM);

  const activeCategories = categories.filter((category) => category.active);
  const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category: activeCategories[0]?.slug ?? "" });
    setModalOpen(true);
  }

  function openEdit(product: ProductDTO) {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      marketplaceAliases: product.marketplaceAliases.join("\n"),
      category: product.category,
      price: String(product.price),
      oldPrice: product.oldPrice ? String(product.oldPrice) : "",
      emoji: product.emoji,
      badge: product.badge ?? "",
      description: product.description,
      material: product.material,
      images: product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : [],
      videoUrl: product.videoUrl,
      filamentId: product.filamentId ?? "",
      weightGrams: product.weightGrams ? String(product.weightGrams) : "",
      printTimeMinutes: product.printTimeMinutes ? String(product.printTimeMinutes) : "",
    });
    setModalOpen(true);
  }

  function handleImageSelected(file: File | undefined) {
    if (!file) return;
    if (form.images.length >= MAX_PRODUCT_IMAGES) {
      showToast(`Máximo de ${MAX_PRODUCT_IMAGES} fotos por produto.`, "error");
      return;
    }
    uploadImage.mutate(file, {
      onSuccess: (url) => setForm((f) => ({ ...f, images: [...f.images, url].slice(0, MAX_PRODUCT_IMAGES) })),
      onError: () => showToast("Não foi possível enviar a foto.", "error"),
    });
  }

  function handleRemoveImage(index: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  }

  function handleVideoSelected(file: File | undefined) {
    if (!file) return;
    uploadVideo.mutate(file, {
      onSuccess: (url) => setForm((f) => ({ ...f, videoUrl: url })),
      onError: () => showToast("Não foi possível enviar o vídeo.", "error"),
    });
  }

  function handleSave() {
    const price = parseFloat(form.price);
    if (!form.name || !price) {
      showToast("Preencha nome e preço.", "error");
      return;
    }
    if (!form.category) {
      showToast("Escolha uma categoria para o produto.", "error");
      return;
    }
    const input = {
      name: form.name,
      sku: form.sku.trim() || null,
      marketplaceAliases: form.marketplaceAliases
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      category: form.category,
      price,
      oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : null,
      emoji: form.emoji || "📦",
      badge: form.badge || null,
      description: form.description,
      material: form.material,
      images: form.images,
      videoUrl: form.videoUrl,
      colors: editing?.colors ?? ["Branco", "Preto"],
      specs: editing?.specs ?? {},
      stock: editing?.stock ?? 20,
      active: editing?.active ?? true,
      filamentId: form.filamentId || null,
      weightGrams: form.weightGrams ? parseFloat(form.weightGrams) : null,
      printTimeMinutes: form.printTimeMinutes ? parseInt(form.printTimeMinutes, 10) : null,
      costPrice: editing?.costPrice ?? null,
    };
    const mutation = editing ? updateProduct.mutateAsync({ id: editing.id, input }) : createProduct.mutateAsync(input);
    mutation
      .then(() => {
        setModalOpen(false);
        showToast(`Produto ${editing ? "atualizado" : "criado"}!`, "success");
      })
      .catch(() => showToast("Não foi possível salvar o produto.", "error"));
  }

  function openCategoryModal(category: ProductCategoryDTO | null) {
    setEditingCategory(category);
    setCategoryForm(
      category
        ? { name: category.name, emoji: category.emoji, sortOrder: String(category.sortOrder), active: category.active }
        : { ...EMPTY_CATEGORY_FORM, sortOrder: String(categories.length + 1) },
    );
    setCategoryModalOpen(true);
  }

  function handleSaveCategory() {
    if (!categoryForm.name.trim()) {
      showToast("Informe o nome da categoria.", "error");
      return;
    }
    const input = {
      name: categoryForm.name.trim(),
      emoji: categoryForm.emoji || "📦",
      sortOrder: parseInt(categoryForm.sortOrder, 10) || 0,
      active: categoryForm.active,
    };
    const action = editingCategory
      ? updateCategory.mutateAsync({ id: editingCategory.id, input })
      : createCategory.mutateAsync(input);
    action
      .then(() => {
        setCategoryModalOpen(false);
        showToast(`Categoria ${editingCategory ? "atualizada" : "criada"}!`, "success");
      })
      .catch(() => showToast("Não foi possível salvar a categoria.", "error"));
  }

  function handleDeleteCategory(category: ProductCategoryDTO) {
    deleteCategory.mutate(category.id, {
      onSuccess: () =>
        showToast(
          category.productsCount > 0
            ? "Categoria em uso: foi desativada e sai da vitrine, mas os produtos continuam com ela."
            : "Categoria excluída.",
          "info",
        ),
      onError: () => showToast("Não foi possível excluir a categoria.", "error"),
    });
  }

  function handleDeactivate(id: string) {
    deactivateProduct.mutate(id, {
      onSuccess: () => showToast("Produto desativado.", "info"),
      onError: () => showToast("Não foi possível desativar o produto.", "error"),
    });
  }

  function handleToggleActive(id: string, active: boolean) {
    toggleActive.mutate(id, {
      onSuccess: () => showToast(active ? "Produto desativado." : "Produto ativado!", active ? "info" : "success"),
      onError: () => showToast("Não foi possível alterar o status do produto.", "error"),
    });
  }

  return (
    <div>
      <div className="admin-header">
        <h1>Produtos</h1>
        {tab === "products" ? (
          <button className="btn-primary" onClick={openCreate}>
            + Novo Produto
          </button>
        ) : (
          <button className="btn-primary" onClick={() => openCategoryModal(null)}>
            + Nova Categoria
          </button>
        )}
      </div>

      <div className="tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            className={`tab-btn${tab === item.key ? " active" : ""}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "products" && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Material</th>
                <th>Preço</th>
                <th>Margem</th>
                <th>Estoque</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ color: "var(--text-muted)" }}>
                    Carregando...
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{ width: "28px", height: "28px", objectFit: "cover", borderRadius: "6px", marginRight: ".5rem", verticalAlign: "middle" }}
                        />
                      ) : (
                        <span style={{ fontSize: "1.5rem" }}>{p.emoji}</span>
                      )}{" "}
                      {p.name}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>{categoryLabel(p.category)}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>{p.material}</td>
                    <td>
                      <strong>R$ {p.price.toFixed(2)}</strong>
                      {p.oldPrice && (
                        <>
                          <br />
                          <small style={{ color: "var(--text-muted)", textDecoration: "line-through" }}>
                            R$ {p.oldPrice.toFixed(2)}
                          </small>
                        </>
                      )}
                    </td>
                    <td style={{ fontSize: ".82rem" }}>
                      {p.costPrice ? (
                        <>
                          <div style={{ color: "var(--text-muted)" }}>Custo: R$ {p.costPrice.toFixed(2)}</div>
                          <div style={{ color: p.price - p.costPrice >= 0 ? "var(--success)" : "var(--danger)" }}>
                            {(((p.price - p.costPrice) / p.price) * 100).toFixed(0)}% margem
                          </div>
                        </>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: p.stock > 0 ? "var(--success)" : "var(--danger)" }}>
                        ● {p.stock > 0 ? `${p.stock} em estoque` : "Sem estoque"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${p.active ? "status-active" : "status-inactive"}`}>
                        {p.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn" onClick={() => openEdit(p)}>
                        ✏️ Editar
                      </button>
                      <button className="action-btn" onClick={() => navigate(`/admin/precificacao?productId=${p.id}`)}>
                        🧮 Calcular preço
                      </button>
                      {p.active ? (
                        <button className="action-btn danger" onClick={() => handleDeactivate(p.id)}>
                          🗑
                        </button>
                      ) : (
                        <button className="action-btn" onClick={() => handleToggleActive(p.id, p.active)}>
                          ▶ Ativar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "categories" && (
        <div className="admin-table-wrap" style={{ marginTop: "1rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Slug</th>
                <th>Ordem</th>
                <th>Produtos</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--text-muted)" }}>
                    Nenhuma categoria cadastrada.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} style={{ opacity: category.active ? 1 : 0.5 }}>
                    <td>
                      {category.emoji} {category.name}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>{category.slug}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>{category.sortOrder}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>{category.productsCount}</td>
                    <td>
                      <span className={`status-badge ${category.active ? "status-active" : "status-inactive"}`}>
                        {category.active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn" onClick={() => openCategoryModal(category)}>
                        ✏️ Editar
                      </button>
                      <button className="action-btn danger" onClick={() => handleDeleteCategory(category)}>
                        {category.productsCount > 0 ? "🚫 Desativar" : "🗑"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p style={{ color: "var(--text-muted)", fontSize: ".78rem", padding: "0 1rem 1rem" }}>
            O slug é gerado do nome na criação e não muda depois — é ele que os produtos guardam.
            Renomear a categoria troca só o rótulo mostrado na loja.
          </p>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editing ? "Editar" : "Novo"} Produto`}>
        <div className="form-grid" style={{ gap: ".8rem" }}>
          <div className="form-group">
            <label>Nome</label>
            <input
              className="admin-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do produto"
            />
          </div>
          <div className="form-group">
            <label>Categoria</label>
            <select
              className="admin-select"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Selecione...</option>
              {activeCategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.emoji} {c.name}
                </option>
              ))}
              {/* Produto de categoria desativada continua editável sem trocar de categoria. */}
              {form.category && !activeCategories.some((c) => c.slug === form.category) && (
                <option value={form.category}>{categoryLabel(form.category)} (inativa)</option>
              )}
            </select>
          </div>
          <div className="form-group">
            <label>Preço (R$)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0,00"
            />
          </div>
          <div className="form-group">
            <label>Preço Original (R$)</label>
            <input
              className="admin-input"
              type="number"
              step="0.01"
              value={form.oldPrice}
              onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div className="form-group">
            <label>SKU (para vincular pedidos importados do Bling)</label>
            <input
              className="admin-input"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="Opcional — precisa bater com o código do produto cadastrado no Bling"
            />
          </div>
          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label>Outros identificadores do marketplace (um por linha)</label>
            <textarea
              className="admin-input"
              rows={3}
              value={form.marketplaceAliases}
              onChange={(e) => setForm({ ...form, marketplaceAliases: e.target.value })}
              placeholder={
                "Outros SKUs de variantes/anúncios diferentes, ou o texto exato do nome do item\n" +
                "que aparece no pedido quando o marketplace não manda SKU nenhum."
              }
            />
          </div>
          <div className="form-group">
            <label>Material de impressão</label>
            <select
              className="admin-select"
              value={form.material}
              onChange={(e) => setForm({ ...form, material: e.target.value })}
            >
              {MATERIAL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Emoji (usado se não houver foto)</label>
            <input className="admin-input" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Badge</label>
            <select
              className="admin-select"
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value as ProductBadge | "" })}
            >
              <option value="">Nenhum</option>
              <option value="new">Novo</option>
              <option value="hot">Hot</option>
              <option value="sale">Sale</option>
            </select>
          </div>
          <div className="form-group">
            <label>Filamento usado</label>
            <select
              className="admin-select"
              value={form.filamentId}
              onChange={(e) => setForm({ ...form, filamentId: e.target.value })}
            >
              <option value="">Nenhum</option>
              {filaments.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.brand} · {f.color}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Peso por unidade (g)</label>
            <input
              className="admin-input"
              type="number"
              value={form.weightGrams}
              onChange={(e) => setForm({ ...form, weightGrams: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div className="form-group">
            <label>Tempo de impressão (min)</label>
            <input
              className="admin-input"
              type="number"
              value={form.printTimeMinutes}
              onChange={(e) => setForm({ ...form, printTimeMinutes: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="form-grid" style={{ gap: ".8rem", marginTop: ".8rem" }}>
          <div className="form-group">
            <label>
              Fotos do produto ({form.images.length}/{MAX_PRODUCT_IMAGES})
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem" }}>
              {form.images.map((url, index) => (
                <div key={url + index} style={{ position: "relative" }}>
                  <img
                    src={url}
                    alt={`Foto ${index + 1}`}
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      background: "var(--bg2)",
                      border: index === 0 ? "2px solid var(--purple)" : "1px solid var(--border)",
                    }}
                  />
                  <button
                    type="button"
                    className="action-btn danger"
                    onClick={() => handleRemoveImage(index)}
                    style={{
                      position: "absolute",
                      top: "-8px",
                      right: "-8px",
                      width: "22px",
                      height: "22px",
                      padding: 0,
                      borderRadius: "50%",
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {form.images.length < MAX_PRODUCT_IMAGES && (
                <div
                  className="upload-zone"
                  style={{ padding: "1rem", width: "80px", height: "80px", boxSizing: "border-box" }}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <div className="upload-text" style={{ fontSize: ".72rem" }}>
                    {uploadImage.isPending ? "Enviando..." : "+ Adicionar"}
                  </div>
                </div>
              )}
            </div>
            <div className="upload-text" style={{ fontSize: ".72rem", marginTop: ".4rem" }}>
              A primeira foto é usada como capa do produto.
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleImageSelected(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <div className="form-group">
            <label>Vídeo do produto</label>
            <div
              className="upload-zone"
              style={{ padding: "1rem" }}
              onClick={() => videoInputRef.current?.click()}
            >
              {form.videoUrl ? (
                <>
                  <video
                    src={form.videoUrl}
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      background: "var(--bg2)",
                      border: "1px solid var(--border)",
                    }}
                    muted
                  />
                  <div className="upload-text" style={{ marginTop: ".5rem" }}>
                    {uploadVideo.isPending ? "Enviando..." : "Clique para trocar o vídeo"}
                  </div>
                </>
              ) : (
                <div className="upload-text">
                  {uploadVideo.isPending ? "Enviando..." : "Clique para enviar um vídeo"}
                </div>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleVideoSelected(e.target.files?.[0])}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label>Descrição</label>
          <textarea
            className="admin-textarea"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição detalhada do produto"
          />
        </div>
        <button
          className="btn-primary"
          style={{ width: "100%", marginTop: "1rem" }}
          onClick={handleSave}
          disabled={uploadImage.isPending || uploadVideo.isPending}
        >
          💾 Salvar Produto
        </button>
      </Modal>

      <Modal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={`${editingCategory ? "Editar" : "Nova"} Categoria`}
      >
        <div className="form-grid" style={{ gap: ".8rem" }}>
          <div className="form-group">
            <label>Nome</label>
            <input
              className="admin-input"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="Ex.: Peças automotivas"
            />
          </div>
          <div className="form-group">
            <label>Emoji</label>
            <input
              className="admin-input"
              value={categoryForm.emoji}
              onChange={(e) => setCategoryForm({ ...categoryForm, emoji: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Ordem na vitrine</label>
            <input
              className="admin-input"
              type="number"
              min={0}
              value={categoryForm.sortOrder}
              onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              className="admin-select"
              value={categoryForm.active ? "active" : "inactive"}
              onChange={(e) => setCategoryForm({ ...categoryForm, active: e.target.value === "active" })}
            >
              <option value="active">Ativa</option>
              <option value="inactive">Inativa (some da loja)</option>
            </select>
          </div>
        </div>
        {editingCategory && (
          <p style={{ color: "var(--text-muted)", fontSize: ".78rem", marginTop: ".6rem" }}>
            Slug: <strong>{editingCategory.slug}</strong> · {editingCategory.productsCount} produto(s)
          </p>
        )}
        <button className="btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleSaveCategory}>
          💾 Salvar Categoria
        </button>
      </Modal>
    </div>
  );
}
