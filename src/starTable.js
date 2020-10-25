export const starTable = Vue.createApp({
  data() {
    return {
      opened: false,
      star: undefined,
      headerText: undefined,
    }
  },
  methods: {
    showStar(star, starName) {
      this.opened = true;
      this.star = star;
      this.headerText = starName;
    },
    close() {
      this.opened = false;
    }
  }
});

starTable.component('hazard', {
  props: ["hazardType", "hazardValue"],
  computed: {
    hValue: function () {
      return this.hazardValue !== undefined && this.hazardValue !== "" ? this.hazardValue : '-'
    }
  },
  template: `
    <span class="badge" v-bind:class="[
      'badge-planet-hazard-' + hazardType,
      'badge-planet-hazard' + hValue,
      'badge-planet-hazard' + hValue + '-' + hazardType,
      ]">{{hValue}}</span>
  `
});

starTable.component('device', {
  props: ["device"],
  template: `
    <span class="label">Device: {{device}}</span>
  `
});

starTable.component('homeworld', {
  props: ["homeworld"],
  template: `
    <span class="label label-info">{{homeworld}} Homeworld</span>
  `
});
