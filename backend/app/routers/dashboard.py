from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import get_settings
from ..database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=schemas.DashboardSummary)
def get_dashboard(db: Session = Depends(get_db)):
    settings = get_settings()
    threshold = settings.low_stock_threshold

    total_products = db.scalar(select(func.count()).select_from(models.Product))
    total_customers = db.scalar(select(func.count()).select_from(models.Customer))
    total_orders = db.scalar(select(func.count()).select_from(models.Order))

    low_stock_products = db.scalars(
        select(models.Product)
        .where(models.Product.quantity <= threshold)
        .order_by(models.Product.quantity)
    ).all()

    return schemas.DashboardSummary(
        total_products=total_products or 0,
        total_customers=total_customers or 0,
        total_orders=total_orders or 0,
        low_stock_count=len(low_stock_products),
        low_stock_threshold=threshold,
        low_stock_products=low_stock_products,
    )
