import {defineUserConfig} from 'vuepress';
import {defaultTheme} from '@vuepress/theme-default';
import book from '../book.json';
import {googleAnalyticsPlugin} from "@vuepress/plugin-google-analytics";
import {resolve} from "path";
import {registerComponentsPlugin} from "@vuepress/plugin-register-components";

export default defineUserConfig({
  lang: 'zh-CN',
  title: book.title,
  description: book.description,
  base: '/gitbook/',
  head: [
    [
      'link', { rel: 'icon', href: '/img/favicon.ico' }
    ]
  ],
  theme: defaultTheme({
    docsBranch: 'main',
    logo: '/img/favicon.ico',// 注意图片放在 public 文件夹下
    navbar: [
      {
        text: '我的博客',
        link: 'http://120.46.170.23/',
      },
      {
        text: '我的作品',
        link: 'https://github.com/weridor',
      },
      {
        text: 'Bilibili',
        link: 'https://space.bilibili.com/440586446/',
      }
    ],
    repo: 'weridor/gitbook',
    sidebar: [
      {
        'text': '前言',
        'link': '/',
      },
      'interview_basic.md',
      'AQS.md',
      'oop-design-pattern.md',
      'factory-pattern.md',
      'adapter-pattern.md',
      'facade-pattern.md',
      'composite-pattern.md',
      'flyweight-pattern.md',
      'end.md',
    ],
  }),
  plugins: [
    googleAnalyticsPlugin({
      id: 'G-6X03SBJR88',
    }),
    registerComponentsPlugin({
      components: {
        Adsense: resolve(__dirname, './components/adsense.vue'),
      },
    }),
  ],
});
