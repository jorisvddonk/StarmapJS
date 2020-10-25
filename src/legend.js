export const legend = Vue.createApp({
  data() {
    return {
      mapping: undefined,
      type: undefined
    }
  },
  methods: {
    useLegend(mapping, type) {
      this.mapping = mapping;
      this.type = type;
    }
  }
});
