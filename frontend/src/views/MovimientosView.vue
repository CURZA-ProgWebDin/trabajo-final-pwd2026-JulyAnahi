<template>
  <div class="movim-container">
    <div class="card-oscura form-panel">
      <h3>Registrar Operación</h3>
      <form @submit.prevent="procesar" class="form-box">
        <label>Seleccionar Producto</label>
        <select v-model="form.producto_id" required>
          <option value="" disabled>Seleccione un producto...</option>
          <option v-for="p in prodStore.productos" :key="p.id" :value="p.id">
            {{ p.nombre }} (Stock: {{ p.stock_actual }})
          </option>
        </select>

        <label>Tipo de Operación</label>
        <select v-model="form.tipo" required>
          <option value="entrada">Entrada (Sumar Mercadería)</option>
          <option value="salida">Salida (Despachar Mercadería)</option>
        </select>

        <label>Cantidad</label>
        <input v-model.number="form.cantidad" type="number" min="1" required />

        <label>Motivo / Descripción</label>
        <input v-model="form.motivo" type="text" required placeholder="Ej. Venta, Ajuste de inventario..." />

        <!-- Anticipación Preventiva UI demandada -->
        <div v-if="alertaStockInsuficiente" class="warning-banner">
          ❌ Error: No es posible despachar esa cantidad. Supera el stock real disponible.
        </div>

        <button type="submit" :disabled="alertaStockInsuficiente || !form.producto_id" class="btn-primario">
          Asentar Movimiento
        </button>
      </form>
    </div>

    <div class="list-panel">
      <h3>{{ authStore.esAdmin ? 'Historial de Todos los Movimientos (Admin)' : 'Mis Movimientos Registrados' }}</h3>
      
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Producto</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Motivo</th>
            <th v-if="authStore.esAdmin">Registrado Por (ID)</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in listaMovimientos" :key="m.id">
            <td>{{ m.id }}</td>
            <td class="prod-col">{{ m.producto }}</td>
            <td>
              <span :class="m.tipo === 'entrada' ? 'badge-entrada' : 'badge-salida'">
                {{ m.tipo === 'entrada' ? '⬇ Entrada' : '⬆ Salida' }}
              </span>
            </td>
            <td class="cant-col">{{ m.cantidad }}</td>
            <td>{{ m.motivo || 'N/A' }}</td>
            <td v-if="authStore.esAdmin">ID Usuario: {{ m.user_id }}</td>
            <td class="date-col">{{ formatearFecha(m.created_at) }}</td>
          </tr>
          <tr v-if="listaMovimientos.length === 0">
            <td :colspan="authStore.esAdmin ? 7 : 6" style="text-align: center; color: var(--texto-secundario);">
              No se han registrado movimientos de inventario.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useProductosStore } from '@/stores/productos'
import movimientosService from '@/services/movimientosService'

const authStore = useAuthStore()
const prodStore = useProductosStore()

const form = ref({ producto_id: '', tipo: 'entrada', cantidad: 1, motivo: 'Gestión Interna' })
const listaMovimientos = ref([])

async function cargarMovimientos() {
  try {
    let res
    if (authStore.esAdmin) {
      res = await movimientosService.listarTodos()
    } else {
      res = await movimientosService.listarMisMovimientos()
    }
    listaMovimientos.value = res.data
  } catch (err) {
    console.error('Error al listar movimientos:', err)
  }
}

onMounted(() => {
  prodStore.cargarProductos()
  cargarMovimientos()
})

const alertaStockInsuficiente = computed(() => {
  if (form.value.tipo !== 'salida' || !form.value.producto_id) return false
  const p = (prodStore.productos || []).find(prod => prod.id === form.value.producto_id)
  return p ? form.value.cantidad > p.stock_actual : false
})

async function procesar() {
  try {
    await movimientosService.registrar(form.value)
    prodStore.actualizarStockLocal(form.value.producto_id, form.value.tipo, form.value.cantidad)
    alert('Movimiento procesado y stock sincronizado localmente.')
    form.value = { producto_id: '', tipo: 'entrada', cantidad: 1, motivo: 'Gestión Interna' }
    await cargarMovimientos()
  } catch (err) {
    alert(err.response?.data?.msg || 'Error transaccional')
  }
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return ''
  const fecha = new Date(fechaStr)
  return fecha.toLocaleString()
}
</script>

<style scoped>
.movim-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}
@media (min-width: 900px) {
  .movim-container {
    grid-template-columns: 350px 1fr;
  }
}
.form-box { display: flex; flex-direction: column; gap: 1rem; }
.warning-banner { background-color: rgba(207, 102, 121, 0.15); color: var(--color-peligro); padding: 1rem; border-radius: 4px; border: 1px solid var(--color-peligro); font-weight: bold; }

.badge-entrada {
  background-color: rgba(3, 218, 198, 0.15);
  color: var(--color-exito);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.85rem;
}
.badge-salida {
  background-color: rgba(207, 102, 121, 0.15);
  color: var(--color-peligro);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.85rem;
}

.prod-col {
  font-weight: 600;
}
.cant-col {
  font-weight: 600;
  font-size: 1.05rem;
}
.date-col {
  color: var(--texto-secundario);
  font-size: 0.9rem;
}
.form-panel {
  height: fit-content;
}
</style>