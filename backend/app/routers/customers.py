from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/customers", tags=["Customers"])


def _get_customer_or_404(db: Session, customer_id: int) -> models.Customer:
    customer = db.get(models.Customer, customer_id)
    if customer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Customer {customer_id} not found")
    return customer


@router.post("", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    # Friendly 409 on duplicate email rather than a raw DB error.
    exists = db.scalar(select(models.Customer).where(models.Customer.email == payload.email))
    if exists is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"A customer with email '{payload.email}' already exists"
        )

    customer = models.Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("", response_model=list[schemas.CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    return db.scalars(select(models.Customer).order_by(models.Customer.id)).all()


@router.get("/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    return _get_customer_or_404(db, customer_id)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = _get_customer_or_404(db, customer_id)
    if customer.orders:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Cannot delete a customer that has existing orders",
        )
    db.delete(customer)
    db.commit()
