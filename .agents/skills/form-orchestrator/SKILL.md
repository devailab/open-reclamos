---
name: form-orchestrator
description: Form orchestration patterns for building reusable, type-safe forms with validation. Use when implementing any data entry UI. Includes patterns for form state, field components, validation composition, and creating custom fields.
---

# Form Orchestrator

Patterns for building scalable forms with validation using the `useForm` hook, field components, and validators. Agnostic to where forms are used (dialogs, pages, filters).

## When to Apply

Reference these guidelines when:

- Building any form with multiple fields
- Creating validation for data entry
- Implementing reusable field components
- Extending with custom fields

## Rule Categories by Priority

| Priority | Category            | Impact | Prefix          |
| -------- | ------------------- | ------ | --------------- |
| 1        | Hook Configuration  | HIGH   | `hook-`         |
| 2        | Validation          | HIGH   | `validation-`  |
| 3        | Field Components   | HIGH   | `field-`       |
| 4        | Custom Fields       | MEDIUM | `custom-`      |

## Quick Reference

### 1. Hook Configuration (HIGH)

- `hook-use-form-init` - Initialize useForm with proper typing

### 2. Validation (HIGH)

- `validation-compose` - Combine multiple validators
- `validation-custom` - Create custom validators

### 3. Field Components (HIGH)

- `field-types` - Available field components
- `field-imperative-api` - Expose focus/validate methods

### 4. Custom Fields (MEDIUM)

- `custom-field-create` - Create new field components
