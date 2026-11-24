# Sales kit: SAT Intensive, Cohort 1

The goal for the first 14 days (to 6 Dec): **5 paid places.** Early-bird (₸60,000) closes 20 Dec or after 10 places. 15 places × ~₸65,000 average ≈ ₸975,000 ≈ **$1,950** from Cohort 1; Cohort 2 at 25 places is where the plan reaches $6k.

Everything below is written to send as-is. Replace the `[brackets]`.

---

## 0. Before you send anything (one evening)

1. **Deploy** the `relaunch` branch and apply the 4 new migrations (billing lock, skill mastery, cohort leads). The page lives at `/sat-intensive`.
2. **Set your real schedule** in `src/lib/cohort.ts` (`schedule`). Default is Tue/Thu 19:00–20:30 Astana.
3. **Kaspi:** decide how you take money. Simplest for Cohort 1: Kaspi transfer to your number, confirmed by screenshot. Put the details in message 5 below.
4. **Lesson recording:** the page promises recordings. Set Zoom/Meet to record to cloud.
5. **Check the mailbox** `hello@adaptiveprep.org` exists (it's on the site twice).

## 1. Where the leads go

Form submissions land in Supabase → Table editor → `cohort_leads`. Change `status` as you work: `new → contacted → call_booked → paid` (or `lost`). Every link below carries `?src=…`, which is saved as `source`, so after a week you'll see which channel actually works.

```sql
-- This week's leads, newest first
select created_at, name, contact, grade, target_score, language, source, status
from cohort_leads where created_at > now() - interval '7 days' order by created_at desc;

-- Which channel converts
select source, count(*) leads, count(*) filter (where status = 'paid') paid
from cohort_leads group by source order by leads desc;
```

**Rule:** reply to every new lead within 24 hours (the page promises one working day).

## 2. Messages

### 2a. Parents of your current/past IELTS students (warm, send first)

> Здравствуйте, [Имя]! Это [Ваше имя], преподаватель [Имя ученика] по IELTS.
> С 12 января запускаю небольшую онлайн-группу по подготовке к SAT (8 недель, 2 занятия в неделю, до 15 учеников) — к экзаменам 6 марта и 1 мая.
> В начале, середине и конце курса ученики проходят полный пробный SAT и видят примерный диапазон баллов и слабые разделы; вам я каждую неделю присылаю короткий отчёт, как и по IELTS.
> Стоимость — ₸75 000 за курс, для первых 10 мест до 20 декабря — ₸60 000.
> Если интересно, вот подробности: adaptivetestprep.org/sat-intensive?src=ielts
> Могу созвониться на 20 минут и провести короткую диагностику — бесплатно.

### 2b. Post for school / parent Telegram and WhatsApp groups

> **Онлайн-группа подготовки к SAT · старт 12 января**
> 8 недель, 16 живых занятий, до 15 учеников. Объяснения на русском или казахском.
> — 3 полных пробных SAT с примерным диапазоном баллов и разбором по 8 разделам
> — домашние задания под слабые места каждого ученика
> — еженедельный отчёт для родителей
> К экзаменам 6 марта и 1 мая 2027. ₸75 000 за курс; первые 10 мест до 20 декабря — ₸60 000.
> Подробности и запись на бесплатную диагностику: adaptivetestprep.org/sat-intensive?src=tg-[название-группы]

Ask the group admin before posting. One post per group; don't repeat it within a week.

### 2c. First reply to a new lead (within 24 h)

> Здравствуйте, [Имя]! Это [Ваше имя] из AdaptivePrep, вы оставили заявку на SAT Intensive.
> Предлагаю созвониться на 20 минут: обсудим цель по баллам и сроки, и я дам короткую диагностику (15 вопросов), чтобы понять уровень.
> Вам удобно [день] в [время] или [день] в [время]?

### 2d. Follow-up if no answer after 2 days

> [Имя], напоминаю про звонок по SAT. Ранняя цена ₸60 000 действует до 20 декабря или пока не закончатся первые 10 мест — сейчас осталось [N]. Подобрать время?

Send one follow-up. If there's still no answer, mark `lost` and move on.

### 2e. After the call: how to pay (only once they've said yes)

> Отлично, бронирую место за [Имя ученика]!
> Оплата — переводом Kaspi на [номер / имя получателя], сумма [₸60 000 / ₸75 000]. В комментарии укажите имя ученика.
> После оплаты пришлите, пожалуйста, скриншот — я подтвержу место и до 10 января пришлю ссылку на занятия и доступ к платформе.
> Если передумаете до первого занятия — верну всю сумму.

After payment: set the lead to `paid` and give the student Pro for the course (section 4).

### 2f. Tutoring centres (B2B pilot; start after 5 cohort deposits)

> Здравствуйте! Меня зовут [Ваше имя], я сделал(а) AdaptivePrep — платформу для подготовки к Digital SAT с объяснениями на русском и казахском.
> Для центров: адаптивный пробный SAT с примерным диапазоном баллов, разбор каждого ученика по 8 разделам, задания под слабые места и готовые еженедельные отчёты для родителей.
> Предлагаю бесплатный пилот на 30 дней для одной вашей SAT-группы. Если подойдёт — $250 в месяц за до 30 учеников.
> Можно показать за 15 минут онлайн — когда удобно?

## 3. The 20-minute call

| Min | What you do |
|---|---|
| 0–3 | Who's on the call, which grade, which SAT date, target score, why (which universities). |
| 3–12 | Short diagnostic: 8 R&W + 7 Math questions, read aloud or screen-shared. Note which skill areas they miss. |
| 12–16 | Tell them honestly what you saw: "Your [skill] is the main thing costing points; that's fixable in 8 weeks if you do the homework." Don't promise a number. |
| 16–20 | Offer: dates, price, early-bird, refund before the first lesson. Ask directly: "Бронируем место?" |

**Objections**

- *Дорого.* "Это около ₸4 700 за полуторачасовое занятие (при ранней цене — ₸3 750), плюс три полных пробных теста и платформа на весь курс. Сравните с ценой одного индивидуального часа у репетитора по SAT." *(Check local tutor prices yourself before using a number here.)*
- *Подготовимся сами.* "Можно. Платформа доступна бесплатно — начните с пробного теста. Группа нужна тем, кому важны дедлайны и обратная связь."
- *А гарантия?* "Гарантий балла не даёт никто честный. Вы увидите диапазон в начале, середине и конце — прогресс будет виден."
- *Нет времени.* "Курс требует 3 часа занятий и 3–4 часа домашки в неделю. Если сейчас это невозможно — следующий поток к майскому/июньскому SAT."

## 4. Admin snippets (Supabase SQL editor)

```sql
-- Give a paid student Pro until the end of the course (run as the dashboard/service role)
update profiles
set tier = 'tier_2', is_trial = false, subscription_ends_at = '2027-03-15'
where email = '[student email]';
```

## 5. Weekly scoreboard (every Monday)

| Week | Leads | Calls | Paid | ₸ collected |
|---|---|---|---|---|
| 1 (to 30 Nov) | | | | |
| 2 (to 6 Dec) | | | **target 5** | |
| 3 (to 13 Dec) | | | | |
| 4 (to 20 Dec, early-bird ends) | | | **target 10** | |
| 6 (to 5 Jan, Cohort 1 closes) | | | **target 15** | |

**Kill rule (6 Dec):** fewer than 5 paid → change the offer before building anything else (IELTS + SAT bundle, a lower price, or NIS/KTL schools as the audience).
