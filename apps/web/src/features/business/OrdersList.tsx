import { formatDateTime, formatPrice } from "./api";
import type { MockOrder, OrderStatus } from "./types";

const STATUS_TEXT: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "Paid, promotion active",
  cancelled: "Cancelled, not charged",
  expired: "Checkout expired, not charged",
  failed: "Failed, not charged"
};

export function OrdersList({ orders, loading, error }: { orders: MockOrder[]; loading: boolean; error?: string }) {
  return (
    <section className="biz-orders" aria-labelledby="orders-heading">
      <h2 id="orders-heading">Orders</h2>
      <p className="biz-fineprint">Mock order log for this demo session (sandbox payments, stored in memory until the API restarts).</p>
      {loading && <p>Loading orders…</p>}
      {error && <p role="alert" className="biz-inline-error">{error}</p>}
      {!loading && !error && orders.length === 0 && <p className="biz-empty">No orders yet. Boost an event above to create one.</p>}
      {orders.length > 0 && (
        <div className="biz-table-wrap">
          <table className="biz-table">
            <thead>
              <tr>
                <th scope="col">Order</th>
                <th scope="col">Event</th>
                <th scope="col">Buyer</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><code>{order.id}</code></td>
                  <td>{order.eventTitle}</td>
                  <td>{order.buyer.name}</td>
                  <td>{formatPrice(order.amountCents, order.currency)}</td>
                  <td><span className={`biz-status biz-status--${order.status}`}>{STATUS_TEXT[order.status]}</span></td>
                  <td>{formatDateTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
