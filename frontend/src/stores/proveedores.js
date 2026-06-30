import { defineStore } from 'pinia'
import { ref } from 'vue'
import proveedoresService from '@/services/proveedoresServices.js'

export const useProveedoresStore = defineStore('proveedores', () => {
  const proveedores = ref([])

  async function cargarProveedores() {
    const res = await proveedoresService.listar()
    proveedores.value = res.data
  }

  return { proveedores, cargarProveedores }
})
