<template>
  <ModalDialog
    :show="show"
    :title="dialogTitle"
    :subtitle="dialogSubtitle"
    width="min(720px, calc(100vw - 48px))"
    max-width="min(720px, calc(100vw - 48px))"
    max-height="min(620px, calc(100vh - 48px))"
    body-class="about-dialog-body"
    :show-footer="false"
    @close="$emit('close')"
  >
    <template #body>
      <AboutOverview />
    </template>
  </ModalDialog>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AboutOverview from './AboutOverview.vue'
import ModalDialog from './ModalDialog.vue'

defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

defineEmits(['close'])

const { locale } = useI18n()

const dialogTitle = computed(() => (
  locale.value === 'zh-CN'
    ? '\u5173\u4e8e SlimNote'
    : 'About SlimNote'
))

const dialogSubtitle = computed(() => (
  locale.value === 'zh-CN'
    ? '\u4e86\u89e3\u9879\u76ee\u5b9a\u4f4d\u3001\u7248\u672c\u548c GitHub \u4ed3\u5e93'
    : 'Project overview, version and repository'
))
</script>
