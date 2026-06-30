import { defineStore } from 'pinia'
import { ref } from 'vue'
import categoriasService from '@/services/categoriasServices.js'

export const useCategoriasStore = defineStore('categorias', () => {
  const categorias = ref([])

  async function cargarCategorias() {
    const res = await categoriasService.listar()
    categorias.value = res.data
  }

  return { categorias, cargarCategorias }
})
