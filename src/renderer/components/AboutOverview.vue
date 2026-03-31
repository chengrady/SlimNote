<template>
  <div class="about-shell">
    <section class="about-hero ui-card">
      <div class="about-hero-copy">
        <span class="about-eyebrow">{{ t('app.name') }}</span>
        <h4>{{ copy.headline }}</h4>
        <p>{{ copy.summary }}</p>
      </div>
      <div class="about-meta">
        <span class="ui-chip">{{ copy.version.replace('{version}', appVersion) }}</span>
        <span class="ui-chip">{{ copy.license }}</span>
      </div>
    </section>

    <section class="about-grid">
      <article class="ui-card about-card">
        <h5>{{ copy.featuresTitle }}</h5>
        <ul class="about-list">
          <li>{{ copy.featureOne }}</li>
          <li>{{ copy.featureTwo }}</li>
          <li>{{ copy.featureThree }}</li>
        </ul>
      </article>

      <article class="ui-card about-card">
        <h5>{{ copy.stackTitle }}</h5>
        <div class="about-stack">
          <span class="ui-chip">Electron</span>
          <span class="ui-chip">Vue 3</span>
          <span class="ui-chip">Monaco</span>
          <span class="ui-chip">Milkdown</span>
        </div>
      </article>
    </section>

    <section class="ui-card about-card about-repo-card">
      <div class="about-repo-header">
        <div>
          <h5>{{ copy.githubTitle }}</h5>
          <p>{{ copy.githubHint }}</p>
        </div>
        <button type="button" class="btn btn-primary" @click="openRepository">
          {{ copy.openGithub }}
        </button>
      </div>
      <button type="button" class="about-link" @click="openRepository">
        {{ repositoryUrl }}
      </button>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import packageJson from '../../../package.json'

const { t, locale } = useI18n()

const repositoryUrl = 'https://github.com/chengrady/SlimNote'
const appVersion = packageJson.version || '1.0.0'

const localizedCopy = {
  'zh-CN': {
    headline: '\u8f7b\u91cf\u3001\u4e13\u6ce8\uff0c\u628a\u5e38\u7528\u6587\u4ef6\u5de5\u4f5c\u6d41\u6536\u5728\u4e00\u4e2a\u754c\u9762\u91cc\u3002',
    summary: 'SlimNote \u662f\u4e00\u4e2a\u9762\u5411\u684c\u9762\u573a\u666f\u7684\u8f7b\u91cf\u7f16\u8f91\u5668\uff0c\u9002\u5408\u5feb\u901f\u6253\u5f00\u6587\u4ef6\uff0c\u4fdd\u6301 Markdown\u3001JSON\u3001SQL\u3001\u65e5\u5fd7\u7b49\u5e38\u89c1\u5de5\u4f5c\u6d41\u5728\u540c\u4e00\u4e2a\u7a97\u53e3\u91cc\u8fde\u8d2f\u5b8c\u6210\u3002',
    version: '\u7248\u672c {version}',
    license: 'MIT License',
    featuresTitle: '\u4f60\u53ef\u4ee5\u7528\u5b83\u6765',
    featureOne: '\u5728\u540c\u4e00\u4e2a\u5de5\u4f5c\u533a\u91cc\u7f16\u8f91\u6587\u672c\u3001\u4ee3\u7801\u3001Markdown \u548c\u65e5\u5fd7\u6587\u4ef6\u3002',
    featureTwo: '\u4f7f\u7528\u5185\u7f6e\u7684 JSON\u3001SQL\u3001Markdown \u8f85\u52a9\u5de5\u5177\uff0c\u66f4\u5feb\u5730\u6574\u7406\u5185\u5bb9\u3002',
    featureThree: '\u628a\u591a\u6807\u7b7e\u3001\u6700\u8fd1\u6587\u4ef6\u3001\u5de5\u4f5c\u533a\u7ba1\u7406\u548c\u8bbe\u7f6e\u4fdd\u6301\u5728\u540c\u4e00\u5957\u7ec6\u8282\u4f53\u9a8c\u91cc\u3002',
    stackTitle: '\u57fa\u4e8e',
    githubTitle: 'GitHub',
    githubHint: '\u5728 GitHub \u4e0a\u67e5\u770b\u9879\u76ee\u6e90\u7801\u3001\u53d1\u5e03\u7248\u672c\u548c Issue \u8bb0\u5f55\u3002',
    openGithub: '\u6253\u5f00 GitHub'
  },
  'en-US': {
    headline: 'Lightweight editing, practical tools, and a cleaner desktop workflow.',
    summary: 'SlimNote is a desktop editor built for quickly opening files, staying focused while writing or coding, and keeping Markdown, JSON, SQL, and log workflows close at hand.',
    version: 'Version {version}',
    license: 'MIT License',
    featuresTitle: 'What it helps with',
    featureOne: 'Edit plain text, code, Markdown and log files in one streamlined workspace.',
    featureTwo: 'Use built-in helpers for JSON, SQL, Markdown and recent-file workflows.',
    featureThree: 'Keep tabs, workspace management and settings in the same focused interface.',
    stackTitle: 'Built with',
    githubTitle: 'Project repository',
    githubHint: 'Browse releases, source code and issue history on GitHub.',
    openGithub: 'Open GitHub'
  }
}

const copy = computed(() => localizedCopy[locale.value] || localizedCopy['en-US'])

function openRepository() {
  window.electronAPI?.openExternal?.(repositoryUrl)
}
</script>

<style scoped>
.about-shell {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.about-hero,
.about-card {
  padding: var(--space-5);
}

.about-hero {
  display: flex;
  justify-content: space-between;
  gap: var(--space-5);
  align-items: flex-start;
  background:
    linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.12), transparent 54%),
    color-mix(in srgb, var(--bg-primary) 94%, rgba(var(--accent-primary-rgb), 0.04));
}

.about-hero-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 520px;
}

.about-eyebrow {
  font-size: var(--ui-font-size-xs);
  font-weight: var(--ui-font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--accent-primary);
}

.about-hero h4,
.about-card h5 {
  margin: 0;
  color: var(--text-main);
}

.about-hero h4 {
  font-size: 22px;
  line-height: 1.15;
}

.about-hero p,
.about-card p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.65;
}

.about-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
}

.about-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.9fr);
  gap: var(--space-4);
}

.about-list {
  margin: var(--space-3) 0 0;
  padding-left: 18px;
  color: var(--text-main);
  line-height: 1.75;
}

.about-stack {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.about-repo-card {
  gap: var(--space-3);
}

.about-repo-header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  align-items: flex-start;
}

.about-link {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.1));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-secondary) 88%, rgba(var(--accent-primary-rgb), 0.04));
  color: var(--accent-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: var(--transition-fast);
  word-break: break-all;
}

.about-link:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.about-link:focus-visible {
  outline: none;
  box-shadow: var(--field-focus-ring);
}

@media (max-width: 720px) {
  .about-hero,
  .about-repo-header {
    flex-direction: column;
  }

  .about-meta {
    justify-content: flex-start;
  }

  .about-grid {
    grid-template-columns: 1fr;
  }
}
</style>
