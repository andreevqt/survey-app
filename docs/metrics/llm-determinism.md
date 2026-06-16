# Детерминизм LLM-анализа: сравнение моделей

**Дата:** 2026-06-17
**Провайдер доступа:** RouterAI (`https://routerai.ru/api/v1`, OpenAI-совместимый шлюз)

## Зачем это измеряли

Функция «Analyze with AI» отдаёт сводку по свободным ответам. Вопрос: **насколько
воспроизводим результат модели на одном и том же входе?** Это напрямую влияет на
наш кэш (PR #5): если модель недетерминирована, то каждый повторный «Re-analyze»
давал бы пользователю *другой* ответ на тех же данных. Кэш фиксирует один результат —
значит, это не только экономия (см. [README](README.md#2-ai-analysis--cost--the-cache-before-after)),
но и **консистентность UX**.

## Методика

- Запрос — тот же, что строит наш бэкенд ([analytics.service.ts](../../backend/src/analytics/analytics.service.ts)):
  system-промпт + строгий JSON со `summary` / `sentiment` / `themes`.
- Вход — эталонный набор `eval/gold-set.json` (3 вопроса со свободными ответами).
- **`temperature = 0`**, по **5 прогонов** на каждую пару (модель × вопрос) = **15 прогонов на модель**.
- Метрики на модель:
  - **byte-identical** — сколько из 15 ответов побитово совпали с первым прогоном того же вопроса;
  - **разброс sentiment** — макс. разница `positive` (в п.п.) между прогонами одного входа;
  - **стабильность тем** — средний Jaccard набора theme-меток относительно первого прогона.
- 8 моделей: по дешёвому и топовому варианту от DeepSeek, Google, OpenAI, Anthropic.
- Скрипт: `/tmp/determinism.mjs` (вызовы через RouterAI; ключ не коммитится).

### Пример промпта

Каждый вызов — два сообщения. **System:**

```
You analyze open-text survey responses. Respond with strict JSON only — no prose, no markdown fences.
```

**User** (на примере вопроса `service-feedback` из `gold-set.json`):

```
Return STRICT JSON of the shape:
{
  "summary": string (1-2 sentences),
  "sentiment": { "positive": number, "neutral": number, "negative": number } (integer percentages, sum 100),
  "themes": [ { "label": string, "count": number, "quote": string } ] (3-5 themes; quote is a short verbatim from the input, <= 140 chars)
}
Do not include any prose outside the JSON. Do not wrap in markdown fences.

Question: Tell us, in a sentence or two, what stood out.

Responses:
1. Pricing was great and the support team was super helpful
2. The pricing page is confusing but the product works fine
3. Love it! Easy to use and pricing is fair
4. Hated the slow loading. Pricing seems high
5. Pricing is reasonable, support helped me twice
6. The export feature is amazing, saved me hours
7. Documentation could be better, but support filled the gap
8. Best polling tool I have tried this year
```

Параметры запроса: `temperature: 0`, `max_tokens: 800`. Ожидаемый ответ — один
JSON-объект, например:

```json
{
  "summary": "Overall positive feedback highlights fair pricing and helpful support, though some users found loading slow.",
  "sentiment": { "positive": 62, "neutral": 25, "negative": 13 },
  "themes": [
    { "label": "pricing", "count": 5, "quote": "Pricing was great and the support team was super helpful" },
    { "label": "support", "count": 3, "quote": "Pricing is reasonable, support helped me twice" }
  ]
}
```

Именно побитовое совпадение таких ответов между 5 прогонами и измеряет метрика
**byte-identical**.

## Результаты — дешёвые модели

| Модель | byte-identical | разброс sentiment | стабильность тем (Jaccard) |
|---|---|---|---|
| `anthropic/claude-3-haiku` | **10 / 15** | 0 п.п. | **0.86** |
| `openai/gpt-4o-mini` | 8 / 15 | 0 п.п. | 0.81 |
| `deepseek/deepseek-v4-flash` | 8 / 15 | 0 п.п. | n/a* |
| `google/gemini-2.5-flash-lite` | 6 / 15 | **13 п.п.** | 0.71 |

## Результаты — топовые модели

| Модель | byte-identical | разброс sentiment | стабильность тем (Jaccard) |
|---|---|---|---|
| `deepseek/deepseek-v4-pro` | **11 / 15** | 0 п.п. | n/a* |
| `openai/gpt-5.5` | 3 / 15 | 0 п.п. | 0.40 |
| `anthropic/claude-sonnet-4.6` | 3 / 15 | 12 п.п. | 0.20 |
| `google/gemini-3.1-pro-preview` | 3 / 15 | 0 п.п. | n/a* |

\* *Метрика тем неинформативна для reasoning-моделей: они кладут JSON в поле
`reasoning`, оставляя `content` пустым, поэтому парсинг тем к ним не применялся.
byte-identical и разброс sentiment по ним валидны (сравнивается сырой ответ).*

## Дёшево vs дорого, бок о бок (byte-identical из 15)

| Провайдер | Дешёвая | Топовая |
|---|---|---|
| DeepSeek | 8 (flash) | **11** (pro) |
| OpenAI | 8 (4o-mini) | 3 (5.5) |
| Anthropic | **10** (haiku) | 3 (sonnet-4.6) |
| Google | 6 (flash-lite) | 3 (pro) |

## Выводы

1. **`temperature = 0` ≠ детерминизм.** Ни одна из 8 моделей не дала 15/15 на
   идентичном входе. Причины — недетерминизм на стороне провайдера: разные
   GPU/батчи, MoE-роутинг экспертов, floating-point. Наш бэкенд использует
   `temperature = 0.2`, то есть в проде разброс будет ещё больше.

2. **Дороже ≠ стабильнее — часто наоборот.** GPT-5.5 (3/15) и Claude Sonnet 4.6
   (3/15) заметно менее воспроизводимы, чем их дешёвые версии 4o-mini (8/15) и
   Haiku (10/15). Вероятно, крупные reasoning/MoE-модели «плывут» сильнее.

3. **Кэш обязателен.** Раз результат недетерминирован при любом выборе модели,
   без кэширования повторный анализ тех же данных давал бы каждый раз другой ответ.
   Кэш гарантирует, что пользователь видит один стабильный результат, пока ответы
   не изменились — и заодно экономит платный вызов (см. [README](README.md)).

4. **Для нашей задачи нет смысла переплачивать за «топ» ради стабильности.**
   Самые воспроизводимые в тесте — `claude-3-haiku` и `deepseek-v4-pro/flash`,
   все дешёвые. Это аргумент в пользу выбора модели по цене/качеству, а не по
   «престижу».

## Ограничения

- Малая выборка: 3 вопроса × 5 прогонов. Достаточно, чтобы показать «не 100%»,
  но не для точного рейтинга моделей между собой.
- Метрика тем не снята для reasoning-моделей (формат ответа с `reasoning`-полем) —
  это известный недочёт замера, а не свойство моделей.
- Замер разовый (один день); провайдеры могут менять бэкенды и поведение со временем.
