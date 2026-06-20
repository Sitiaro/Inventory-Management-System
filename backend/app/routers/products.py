from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/products", tags=["Products"])


def _get_product_or_404(db: Session, product_id: int) -> models.Product:
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Product {product_id} not found")
    return product


@router.post("", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    # Catch the duplicate here so we can return a clear 409 instead of a
    # generic DB constraint error.
    exists = db.scalar(select(models.Product).where(models.Product.sku == payload.sku))
    if exists is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"A product with SKU '{payload.sku}' already exists"
        )

    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("", response_model=list[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.scalars(select(models.Product).order_by(models.Product.id)).all()


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return _get_product_or_404(db, product_id)


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)
):
    product = _get_product_or_404(db, product_id)
    data = payload.model_dump(exclude_unset=True)

    # Only re-check uniqueness when the SKU actually changes.
    new_sku = data.get("sku")
    if new_sku is not None and new_sku != product.sku:
        clash = db.scalar(select(models.Product).where(models.Product.sku == new_sku))
        if clash is not None:
            raise HTTPException(
                status.HTTP_409_CONFLICT, f"A product with SKU '{new_sku}' already exists"
            )

    for field, value in data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = _get_product_or_404(db, product_id)
    # Keep order history intact - block deletes for products already ordered.
    if product.order_items:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cannot delete a product that is part of existing orders",
        )
    db.delete(product)
    db.commit()
