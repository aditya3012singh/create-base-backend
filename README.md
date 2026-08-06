# create-base-backend

Interactive CLI initializer to instantly scaffold production-ready Node.js Express APIs in either JavaScript or TypeScript, with customizable database and event messaging architectures.

---

## 🚀 Usage

You do not need to install the package globally. Simply run the initializer inside your target workspace directory:

```bash
npx @aditya3012singh/create-base-backend
```

The CLI will guide you through interactive choices to customize your template.

---

## 🎨 Interactive Prompt Options & Customizations

During scaffolding, the customizer prunes the templates down to only your selected stack, ensuring no unused dependencies or files are left behind:

| Selection | Target File Type | Kept Files | Deleted/Pruned Files |
| :--- | :--- | :--- | :--- |
| **PostgreSQL (Prisma)** | `.ts` / `.js` | `prisma/`, `src/core/config/db.*`, `prisma.user.repository.*` | `mongoose.*`, `user.model.*`, `mongoose.user.repository.*`, `seed.*` |
| **MongoDB (Mongoose)** | `.ts` / `.js` | `src/core/config/db.*` (renamed from `mongoose.*`), `mongoose.user.repository.*`, `seed.*` | `prisma/` folder, `prisma.user.repository.*` |
| **Redis Pub/Sub** | `.ts` / `.js` | `redisEventBus.*` | `src/core/events/providers/` directory |
| **RabbitMQ** | `.ts` / `.js` | `providers/rabbitmq.bus.*` | `providers/kafka.bus.*`, `redisEventBus.*` |
| **Apache Kafka** | `.ts` / `.js` | `providers/kafka.bus.*` | `providers/rabbitmq.bus.*`, `redisEventBus.*` |

---

## 💾 Database Integration: Mongoose vs. Prisma

### A. Working with Mongoose (MongoDB)
If you chose MongoDB + Mongoose, use this pattern to add models and seed:

1. **Write Schema & Model** (`src/modules/products/models/product.model.ts`):
   ```typescript
   import mongoose, { Schema, Document } from 'mongoose';

   export interface IProduct extends Document {
       name: string;
       price: number;
   }

   const ProductSchema = new Schema({
       name: { type: String, required: true },
       price: { type: Number, required: true }
   }, { timestamps: true });

   export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);
   ```
2. **Seed Data** (`src/core/config/seed.ts`):
   ```typescript
   import { ProductModel } from '../../modules/products/models/product.model.js';
   // Inside seed's main():
   await ProductModel.create({ name: 'Development Server', price: 99.99 });
   ```
   Run seed using: `npm run db:seed`

---

### B. Working with Prisma (PostgreSQL)
If you chose PostgreSQL + Prisma, use this pattern:

1. **Add Model to Schema** (`prisma/schema.prisma`):
   ```prisma
   model Product {
     id        String   @id @default(uuid())
     name      String
     price     Float
     createdAt DateTime @default(now())
   }
   ```
2. **Apply Migrations**:
   ```bash
   npm run db:migrate
   ```
3. **Seed Data** (`prisma/seed.ts`):
   ```typescript
   // Inside seed's main():
   await prisma.product.create({
       data: { name: 'Development Server', price: 99.99 }
   });
   ```
   Run seed using: `npm run db:seed`

---

## 📡 Event Messaging: Redis vs. RabbitMQ vs. Kafka

The application uses `dualModeEventBus` to abstract the underlying broker. You publish and subscribe identically regardless of your choice.

### A. Publishing an Event (Universal Call)
To emit a message from any service or controller:
```typescript
import dualModeEventBus from '../../core/events/dualModeEventBus.js';

await dualModeEventBus.publish('ORDER_COMPLETED', {
    orderId: 'order_1001',
    amount: 150.00,
    email: 'buyer@domain.com'
});
```

---

### B. Subscribing to an Event (Universal Call)
Register your event listener inside `src/core/events/listeners/index.ts` so it loads on server boot:
```typescript
import { IEventBus } from '../eventBus.interface.js';
import logger from '../../logger/structuredLogger.js';

export function registerListeners(eventBus: IEventBus): void {
    eventBus.subscribe('ORDER_COMPLETED', async (payload: any) => {
        logger.info(`📥 [Subscriber] Processing order ${payload.orderId}...`);
        // Add business logic here
    });
}
```

---

### C. Broker Mechanics under the hood:

* **Redis Pub/Sub**: Subscribes to the channel named `ORDER_COMPLETED` using Node Redis client, fanning out received messages dynamically to registered local callbacks in memory.
* **RabbitMQ**: Asserts a dedicated, unique queue named `q_ORDER_COMPLETED_<AppName>_<HandlerName>` bound to a fanout exchange, ensuring every listener gets its own duplicate copy of the published event (broadcasting pub/sub semantics).
* **Apache Kafka**: Subscribes the consumer to a global topic. Incoming events are routed using message keys (e.g. `'ORDER_COMPLETED'`) to registered handler arrays in memory from a single consume loop, preventing multiple consumer execution crash states.
