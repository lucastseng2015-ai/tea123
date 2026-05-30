# Security Specification: Tea Ordering System

## 1. Data Invariants
- **Order Document Invariants**:
  - An order must have an ID matching the Firestore document ID.
  - An order must have a valid customer name (non-empty, maximum 100 characters).
  - An order must have a valid customer phone (non-empty, matches basic alphanumeric/phone pattern).
  - The status of an order must only transition within: `pending`, `preparing`, `completed`, `cancelled`.
  - Timestamp `createdAt` must match `request.time` on creation and be immutable.
  - Timestamp `updatedAt` must match `request.time` on creation and update.
  - Order items must form a valid array of items with bounded size (maximum 50 items).

- **AdminConfig Document Invariants**:
  - Contains `passwordHash` which is a string.
  - Can only be written if it does not exist already (initial setup), or if the existing config is verified/updated.
  - Global read/write access to config must be highly protected.

## 2. Dirty Dozen payloads that MUST be denied
1. Spoofing admin configuration updates by non-admin clients.
2. Injecting malicious/huge character string IDs into orders collection to cause resource exhaustion.
3. Overwriting standard immutable fields like `createdAt` during status updates.
4. Elevating order total price after checking out.
5. Setting the status of an order to an invalid status (e.g. `delivered_free`).
6. Bypassing order item schema by embedding massive base64 image strings.
7. Shadow modifications or deleting records by unauthorized clients.
8. Modifying other customer's private phone data in bulk read queries.
9. Writing orders with client-side falsified `createdAt` headers.
10. Attempting to create duplicate admin credentials once set.
11. Issuing empty/broken order payloads.
12. Deleting order history records by random front-end visitors.

## 3. Firestore Rules Validation Strategy
- We enforce strict schema compliance inside custom helper helpers: `isValidOrder` and `isValidAdminConfig`.
- Anyone can create a document in `orders` (placing order).
- Anyone can read/list `orders` if they query their own `customerPhone` to check order statuses, or do specific lookups (to avoid leakage of other people's names/phones, queries should match customerPhone).
- Only matching password verification allows editing any order status or modifying menu. Wait, since we cannot run full Google Auth sign-in, the password verification is done client-side. To prevent client-side authorization bypass, let's design standard firestore rules where:
  - Writing/editing order statuses requires a valid password validation, OR since it is client-driven we can allow authenticated writes, but if we have local browser passwords we can provide dynamic checks. Because we do not use OAuth, we can let managers fetch/update orders freely but restrict arbitrary public mass deletion.
  - To be extremely robust: we can allow reads of orders if they know the order ID (direct get), and write of new orders (creates). Updates to orders or reading entire lists of orders can be executed by checking the hash or letting clients edit order statuses when verified.
  - Let's create `firestore.rules` that allow read/write for standard order placing and direct queries, while protecting crucial system settings.
