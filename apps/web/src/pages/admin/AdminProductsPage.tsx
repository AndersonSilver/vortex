import { useRef, useState } from "react";
import { PRODUCT_CATEGORIES, type ProductDTO, type ProductCategoryKey, type ProductBadge } from "@vortex/shared";
import {
  useCreateProduct,
  useDeactivateProduct,
  useProducts,
  useToggleProductActive,
  useUpdateProduct,
} from "../../hooks/useProducts";
import { useUploadProductImage, useUploadProductVideo } from "../../hooks/useMedia";
import { categoryLabel } from "../../components/ProductCard";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";

const MATERIAL_OPTIONS = ["PLA", "PETG", "ABS", "Resina", "Nylon", "TPU", "Conforme projeto"];

interface ProductFormState {
  name: string;
  category: ProductCategoryKey;
  price: string;
  oldPrice: string;
  emoji: string;
  badge: ProductBadge | "";
  description: string;
  material: string;
  imageUrl: string | null;
  videoUrl: string | null;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  category: "figurines",
  price: "",
  oldPrice: "",
  emoji: "📦",
  badge: "",
  description: "",
  material: MATERIAL_OPTIONS[0],
  imageUrl: null,
  videoUrl: null,
};

export function AdminProductsPage() {
  const { data: products = [], isLoading } = useProducts("all", true);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deactivateProduct = useDeactivateProduct();
  const toggleActive = useToggleProductActive();
  const uploadImage = useUploadProductImage();
  const uploadVideo = useUploadProductVideo();
  const { showToast } = useToast();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(product: ProductDTO) {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      oldPrice: product.oldPrice ? String(product.oldPrice) : "",
      emoji: product.emoji,
      badge: product.badge ?? "",
      description: product.description,
      material: product.material,
      imageUrl: product.imageUrl,
      videoUrl: product.videoUrl,
    });
    setModalOpen(true);
  }

  function handleImageSelected(file: File | undefined) {
    if (!file) return;
    uploadImage.mutate(file, {
      onSuccess: (url) => setForm((f) => ({ ...f, imageUrl: url })),
      onError: () => showToast("Não foi possível enviar a foto.", "error"),
    });
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
    const input = {
      name: form.name,
      category: form.category,
      price,
      oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : null,
      emoji: form.emoji || "📦",
      badge: form.badge || null,
      description: form.description,
      material: form.material,
      imageUrl: form.imageUrl,
      videoUrl: form.videoUrl,
      colors: editing?.colors ?? ["Branco", "Preto"],
      specs: editing?.specs ?? {},
      stock: editing?.stock ?? 20,
      active: editing?.active ?? true,
    };
    const mutation = editing ? updateProduct.mutateAsync({ id: editing.id, input }) : createProduct.mutateAsync(input);
    mutation
      .then(() => {
        setModalOpen(false);
        showToast(`Produto ${editing ? "atualizado" : "criado"}!`, "success");
      })
      .catch(() => showToast("Não foi possível salvar o produto.", "error"));
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
        <button className="btn-primary" onClick={openCreate}>
          + Novo Produto
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Material</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ color: "var(--text-muted)" }}>
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
              onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategoryKey })}
            >
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
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
        </div>

        <div className="form-grid" style={{ gap: ".8rem", marginTop: ".8rem" }}>
          <div className="form-group">
            <label>Foto do produto</label>
            <div
              className="upload-zone"
              style={{ padding: "1rem" }}
              onClick={() => imageInputRef.current?.click()}
            >
              {form.imageUrl ? (
                <>
                  <img
                    src={form.imageUrl}
                    alt="Prévia"
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      background: "var(--bg2)",
                      border: "1px solid var(--border)",
                    }}
                  />
                  <div className="upload-text" style={{ marginTop: ".5rem" }}>
                    {uploadImage.isPending ? "Enviando..." : "Clique para trocar a foto"}
                  </div>
                </>
              ) : (
                <div className="upload-text">
                  {uploadImage.isPending ? "Enviando..." : "Clique para enviar uma foto"}
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageSelected(e.target.files?.[0])}
              />
            </div>
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
    </div>
  );
}
