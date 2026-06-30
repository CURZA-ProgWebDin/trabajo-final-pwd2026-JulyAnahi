<template>
  <div>
    <div class="header-section">
      <h2>Inventario General de Productos</h2>
      <button v-if="authStore.esAdmin" @click="abrirAlta" class="btn-primario">+ Agregar Nuevo Producto</button>
    </div>

    <!-- Buscador Reactivo -->
    <div class="search-container">
      <input v-model="filtro" type="text" placeholder="Filtrar productos por nombre..." class="search-input" />
    </div>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Descripción</th>
          <th>Categoría</th>
          <th>Proveedor</th>
          <th>P. Costo</th>
          <th>P. Venta</th>
          <th>Stock Actual</th>
          <th>Estado</th>
          <th v-if="authStore.esAdmin">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in productosFiltrados" :key="p.id" :class="{ 'critico': p.stock_actual <= p.stock_minimo }">
          <td>{{ p.id }}</td>
          <td><strong>{{ p.nombre }}</strong></td>
          <td>{{ p.descripcion || 'Sin descripción' }}</td>
          <td><span class="badge">{{ p.categoria || 'N/A' }}</span></td>
          <td><span class="badge badge-secundario">{{ p.proveedor || 'N/A' }}</span></td>
          <td>${{ p.precio_costo.toFixed(2) }}</td>
          <td>${{ p.precio_venta.toFixed(2) }}</td>
          <td>{{ p.stock_actual }} / {{ p.stock_minimo }} (Mín)</td>
          <td>
            <span v-if="p.stock_actual <= p.stock_minimo" class="status-low">⚠️ Reponer</span>
            <span v-else class="status-ok">✔ Normal</span>
          </td>
          <td v-if="authStore.esAdmin">
            <button @click="abrirEdicion(p)" class="btn-edit">Editar</button>
            <button @click="eliminar(p.id)" class="btn-danger">Eliminar</button>
          </td>
        </tr>
        <tr v-if="productosFiltrados.length === 0">
          <td :colspan="authStore.esAdmin ? 10 : 9" style="text-align: center; color: var(--texto-secundario);">
            No se encontraron productos cargados en el inventario.
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Modal Reutilizable -->
    <BaseModal :mostrar="modalAbierto" @cerrar="modalAbierto = false">
      <template #titulo>
        <h3>{{ editando ? 'Actualizar Ficha de Producto' : 'Registrar Nuevo Producto' }}</h3>
      </template>
      
      <form @submit.prevent="guardar" class="form-layout">
        <label>Nombre del Producto</label>
        <input v-model="form.nombre" type="text" required placeholder="Ej. Fideos Moñito 500g" />

        <label>Descripción</label>
        <textarea v-model="form.descripcion" rows="3" placeholder="Detalles de presentación, marca..."></textarea>

        <div class="row-inputs">
          <div>
            <label>Precio Costo ($)</label>
            <input v-model.number="form.precio_costo" type="number" step="0.01" min="0" required />
          </div>
          <div>
            <label>Precio Venta ($)</label>
            <input v-model.number="form.precio_venta" type="number" step="0.01" min="0" required />
          </div>
        </div>

        <div class="row-inputs">
          <div>
            <label>Stock Inicial</label>
            <input v-model.number="form.stock_actual" type="number" min="0" required />
          </div>
          <div>
            <label>Stock Mínimo</label>
            <input v-model.number="form.stock_minimo" type="number" min="0" required />
          </div>
        </div>

        <label>Categoría</label>
        <select v-model="form.categoria_id" required>
          <option value="" disabled>Seleccione una categoría...</option>
          <option v-for="cat in categoriasStore.categorias" :key="cat.id" :value="cat.id">
            {{ cat.nombre }}
          </option>
        </select>

        <label>Proveedor</label>
        <select v-model="form.proveedor_id">
          <option :value="null">Ninguno</option>
          <option v-for="prov in proveedoresStore.proveedores" :key="prov.id" :value="prov.id">
            {{ prov.nombre }}
          </option>
        </select>

        <button type="submit" class="btn-primario btn-block">
          {{ editando ? 'Guardar Cambios' : 'Confirmar Alta' }}
        </button>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProductosStore } from '@/stores/productos'
import { useCategoriasStore } from '@/stores/categorias'
import { useProveedoresStore } from '@/stores/proveedores'
import productosService from '@/services/productosService'
import BaseModal from '@/components/BaseModal.vue'

const authStore = useAuthStore()
const prodStore = useProductosStore()
const categoriasStore = useCategoriasStore()
const proveedoresStore = useProveedoresStore()

const filtro = ref('')
const modalAbierto = ref(false)
const editando = ref(false)
const productoIdSeleccionado = ref(null)

const form = ref({
  nombre: '',
  descripcion: '',
  precio_costo: 0,
  precio_venta: 0,
  stock_actual: 0,
  stock_minimo: 0,
  categoria_id: '',
  proveedor_id: null
})

onMounted(async () => {
  await prodStore.cargarProductos()
  if (authStore.esAdmin) {
    await categoriasStore.cargarCategorias()
    await proveedoresStore.cargarProveedores()
  }
})

const productosFiltrados = computed(() => {
  return (prodStore.productos || []).filter(p =>
    p.nombre.toLowerCase().includes(filtro.value.toLowerCase())
  )
})

function abrirAlta() {
  editando.value = false
  form.value = {
    nombre: '',
    descripcion: '',
    precio_costo: 0,
    precio_venta: 0,
    stock_actual: 0,
    stock_minimo: 0,
    categoria_id: '',
    proveedor_id: null
  }
  modalAbierto.value = true
}

function abrirEdicion(prod) {
  editando.value = true
  productoIdSeleccionado.value = prod.id
  form.value = {
    nombre: prod.nombre,
    descripcion: prod.descripcion || '',
    precio_costo: prod.precio_costo,
    precio_venta: prod.precio_venta,
    stock_actual: prod.stock_actual,
    stock_minimo: prod.stock_minimo,
    categoria_id: prod.categoria_id,
    proveedor_id: prod.proveedor_id
  }
  modalAbierto.value = true
}

async function guardar() {
  try {
    if (editando.value) {
      await productosService.actualizar(productoIdSeleccionado.value, form.value)
    } else {
      await productosService.crear(form.value)
    }
    modalAbierto.value = false
    await prodStore.cargarProductos()
  } catch (err) {
    alert(err.response?.data?.msg || 'Error al guardar el producto')
  }
}

async function eliminar(id) {
  if (confirm('¿Está seguro de eliminar este producto?')) {
    try {
      await productosService.eliminar(id)
      await prodStore.cargarProductos()
    } catch (err) {
      alert(err.response?.data?.msg || 'Error al eliminar el producto')
    }
  }
}
</script>

<style scoped>
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.search-container { margin-bottom: 1.5rem; }
.search-input { width: 100%; box-sizing: border-box; }
.form-layout { display: flex; flex-direction: column; gap: 0.8rem; }
.row-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.row-inputs div { display: flex; flex-direction: column; }
.btn-block { width: 100%; margin-top: 1rem; }
.critico { background-color: rgba(207, 102, 121, 0.08); }
.status-low { color: var(--color-peligro); font-weight: bold; }
.status-ok { color: var(--color-exito); }
.badge { background-color: rgba(187, 134, 252, 0.15); color: var(--color-primario); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.85rem; }
.badge-secundario { background-color: rgba(255, 255, 255, 0.08); color: var(--texto-secundario); }
textarea {
  background-color: var(--bg-input);
  color: var(--texto-principal);
  border: 1px solid var(--borde);
  padding: 0.75rem;
  border-radius: 4px;
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
}
textarea:focus { outline: 2px solid var(--color-primario); }
</style>