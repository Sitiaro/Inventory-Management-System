from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post("", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, payload.customer_id)
    if customer is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Customer {payload.customer_id} not found"
        )

    # Collapse repeated product lines (e.g. 2 + 3) so the stock check sees the
    # full quantity for each product at once.
    requested: dict[int, int] = defaultdict(int)
    for item in payload.items:
        requested[item.product_id] += item.quantity

    order = models.Order(customer_id=customer.id, status="confirmed")
    total = Decimal("0.00")

    try:
        for product_id, qty in requested.items():
            # FOR UPDATE prevents two concurrent orders from overselling the
            # same product.
            product = db.scalar(
                select(models.Product)
                .where(models.Product.id == product_id)
                .with_for_update()
            )
            if product is None:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, f"Product {product_id} not found"
                )

            if qty > product.quantity:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"Insufficient stock for '{product.name}' (SKU {product.sku}): "
                    f"requested {qty}, available {product.quantity}",
                )

            product.quantity -= qty

            subtotal = product.price * qty
            total += subtotal
            order.items.append(
                models.OrderItem(
                    product_id=product.id,
                    quantity=qty,
                    unit_price=product.price,
                    subtotal=subtotal,
                )
            )

        order.total_amount = total
        db.add(order)
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(order)
    return order


@router.get("", response_model=list[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return db.scalars(
        select(models.Order)
        .options(selectinload(models.Order.items))
        .order_by(models.Order.id.desc())
    ).all()


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.scalar(
        select(models.Order)
        .where(models.Order.id == order_id)
        .options(selectinload(models.Order.items))
    )
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Order {order_id} not found")
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.scalar(
        select(models.Order)
        .where(models.Order.id == order_id)
        .options(selectinload(models.Order.items))
    )
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Order {order_id} not found")

    # Put the stock back when an order is cancelled.
    for item in order.items:
        product = db.scalar(
            select(models.Product)
            .where(models.Product.id == item.product_id)
            .with_for_update()
        )
        if product is not None:
            product.quantity += item.quantity

    db.delete(order)
    db.commit()
