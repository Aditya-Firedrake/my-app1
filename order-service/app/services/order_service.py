from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import httpx
import redis
import json
import logging
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from app.models.order import Order, OrderItem, Cart, CartItem, OrderStatus, PaymentStatus
from app.schemas.order import (
    OrderCreate, OrderUpdate, CartItemCreate, CheckoutRequest,
    OrderFilter, PaymentRequest
)
from app.core.config import settings
from app.core.exceptions import (
    OrderNotFoundError, CartNotFoundError, ProductNotFoundError,
    InsufficientStockError, PaymentFailedError
)

logger = logging.getLogger(__name__)


class OrderService:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            decode_responses=True
        )
        self.product_service_url = settings.PRODUCT_SERVICE_URL
        self.user_service_url = settings.USER_SERVICE_URL
        self.notification_service_url = settings.NOTIFICATION_SERVICE_URL

    async def _get_product_details(self, product_id: str) -> Dict[str, Any]:
        """Fetch product details from Product Service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.product_service_url}/api/products/{product_id}",
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json()["data"]
        except Exception as e:
            logger.error(f"Failed to fetch product {product_id}: {e}")
            raise ProductNotFoundError(f"Product {product_id} not found")

    async def _validate_user(self, user_id: UUID, token: str) -> bool:
        """Validate user with User Service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.user_service_url}/api/users/{user_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10.0
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to validate user {user_id}: {e}")
            return False

    async def _update_product_stock(self, product_id: str, quantity: int) -> bool:
        """Update product stock in Product Service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.product_service_url}/api/products/{product_id}/stock",
                    json={"quantity": -quantity},  # Negative to reduce stock
                    timeout=10.0
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to update stock for product {product_id}: {e}")
            return False

    async def _send_notification(self, user_id: UUID, order_id: UUID, notification_type: str) -> bool:
        """Send notification via Notification Service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.notification_service_url}/api/notifications/send",
                    json={
                        "user_id": str(user_id),
                        "order_id": str(order_id),
                        "type": notification_type
                    },
                    timeout=10.0
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return False

    def _generate_order_number(self) -> str:
        """Generate unique order number"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = str(uuid4())[:8]
        return f"ORD-{timestamp}-{random_suffix}"

    def _calculate_order_totals(self, items: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate order totals including tax and shipping"""
        subtotal = sum(item["unit_price"] * item["quantity"] for item in items)
        tax_rate = 0.18  # 18% GST
        tax_amount = subtotal * tax_rate
        shipping_amount = 0.0 if subtotal >= 1000 else 100.0  # Free shipping above ₹1000
        discount_amount = 0.0  # Can be calculated based on coupons
        total_amount = subtotal + tax_amount + shipping_amount - discount_amount

        return {
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "shipping_amount": shipping_amount,
            "discount_amount": discount_amount,
            "total_amount": total_amount
        }

    # Cart Operations
    async def get_cart(self, db: Session, user_id: Optional[UUID] = None, session_id: Optional[str] = None) -> Cart:
        """Get or create cart for user or session"""
        if user_id:
            cart = db.query(Cart).filter(Cart.user_id == user_id).first()
        elif session_id:
            cart = db.query(Cart).filter(Cart.session_id == session_id).first()
        else:
            raise ValueError("Either user_id or session_id must be provided")

        if not cart:
            cart = Cart(user_id=user_id, session_id=session_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)

        return cart

    async def add_to_cart(
        self, 
        db: Session, 
        cart_item: CartItemCreate, 
        user_id: Optional[UUID] = None, 
        session_id: Optional[str] = None
    ) -> Cart:
        """Add item to cart"""
        cart = await self.get_cart(db, user_id, session_id)
        
        # Get product details
        product_details = await self._get_product_details(cart_item.product_id)
        
        # Check if item already exists in cart
        existing_item = db.query(CartItem).filter(
            and_(
                CartItem.cart_id == cart.id,
                CartItem.product_id == cart_item.product_id
            )
        ).first()

        if existing_item:
            existing_item.quantity += cart_item.quantity
            existing_item.updated_at = datetime.utcnow()
        else:
            new_item = CartItem(
                cart_id=cart.id,
                product_id=cart_item.product_id,
                product_sku=product_details["sku"],
                product_name=product_details["name"],
                product_image=product_details["images"][0] if product_details["images"] else None,
                unit_price=product_details["price"],
                quantity=cart_item.quantity
            )
            db.add(new_item)

        cart.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(cart)
        
        return cart

    async def update_cart_item(
        self, 
        db: Session, 
        product_id: str, 
        quantity: int, 
        user_id: Optional[UUID] = None, 
        session_id: Optional[str] = None
    ) -> Cart:
        """Update cart item quantity"""
        cart = await self.get_cart(db, user_id, session_id)
        
        cart_item = db.query(CartItem).filter(
            and_(
                CartItem.cart_id == cart.id,
                CartItem.product_id == product_id
            )
        ).first()

        if not cart_item:
            raise CartNotFoundError("Item not found in cart")

        if quantity <= 0:
            db.delete(cart_item)
        else:
            cart_item.quantity = quantity
            cart_item.updated_at = datetime.utcnow()

        cart.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(cart)
        
        return cart

    async def remove_from_cart(
        self, 
        db: Session, 
        product_id: str, 
        user_id: Optional[UUID] = None, 
        session_id: Optional[str] = None
    ) -> Cart:
        """Remove item from cart"""
        cart = await self.get_cart(db, user_id, session_id)
        
        cart_item = db.query(CartItem).filter(
            and_(
                CartItem.cart_id == cart.id,
                CartItem.product_id == product_id
            )
        ).first()

        if cart_item:
            db.delete(cart_item)
            cart.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(cart)

        return cart

    async def clear_cart(
        self, 
        db: Session, 
        user_id: Optional[UUID] = None, 
        session_id: Optional[str] = None
    ) -> Cart:
        """Clear all items from cart"""
        cart = await self.get_cart(db, user_id, session_id)
        
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
        cart.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(cart)
        
        return cart

    # Order Operations
    async def create_order(
        self, 
        db: Session, 
        order_data: OrderCreate, 
        user_token: str
    ) -> Order:
        """Create a new order"""
        # Validate user
        if not await self._validate_user(order_data.user_id, user_token):
            raise ValueError("Invalid user")

        # Validate and get product details
        order_items = []
        for item in order_data.items:
            product_details = await self._get_product_details(item.product_id)
            
            # Check stock availability
            if product_details["stock"] < item.quantity:
                raise InsufficientStockError(f"Insufficient stock for product {item.product_id}")
            
            order_items.append({
                "product_id": item.product_id,
                "product_sku": product_details["sku"],
                "product_name": product_details["name"],
                "product_image": product_details["images"][0] if product_details["images"] else None,
                "unit_price": product_details["price"],
                "quantity": item.quantity,
                "total_price": product_details["price"] * item.quantity
            })

        # Calculate totals
        totals = self._calculate_order_totals(order_items)

        # Create order
        order = Order(
            user_id=order_data.user_id,
            order_number=self._generate_order_number(),
            shipping_address=order_data.shipping_address,
            billing_address=order_data.billing_address,
            shipping_phone=order_data.shipping_phone,
            shipping_email=order_data.shipping_email,
            payment_method=order_data.payment_method,
            subtotal=totals["subtotal"],
            tax_amount=totals["tax_amount"],
            shipping_amount=totals["shipping_amount"],
            discount_amount=totals["discount_amount"],
            total_amount=totals["total_amount"]
        )

        db.add(order)
        db.flush()  # Get the order ID

        # Create order items
        for item_data in order_items:
            order_item = OrderItem(
                order_id=order.id,
                **item_data
            )
            db.add(order_item)

        db.commit()
        db.refresh(order)

        # Update product stock
        for item in order_data.items:
            await self._update_product_stock(item.product_id, item.quantity)

        # Send order confirmation notification
        await self._send_notification(order_data.user_id, order.id, "order_confirmation")

        return order

    async def get_order(self, db: Session, order_id: UUID, user_id: Optional[UUID] = None) -> Order:
        """Get order by ID"""
        query = db.query(Order).filter(Order.id == order_id)
        if user_id:
            query = query.filter(Order.user_id == user_id)
        
        order = query.first()
        if not order:
            raise OrderNotFoundError(f"Order {order_id} not found")
        
        return order

    async def get_user_orders(
        self, 
        db: Session, 
        user_id: UUID, 
        skip: int = 0, 
        limit: int = 20,
        filters: Optional[OrderFilter] = None
    ) -> Dict[str, Any]:
        """Get orders for a user with filtering and pagination"""
        query = db.query(Order).filter(Order.user_id == user_id)

        if filters:
            if filters.status:
                query = query.filter(Order.status == filters.status)
            if filters.payment_status:
                query = query.filter(Order.payment_status == filters.payment_status)
            if filters.start_date:
                query = query.filter(Order.created_at >= filters.start_date)
            if filters.end_date:
                query = query.filter(Order.created_at <= filters.end_date)
            if filters.min_amount:
                query = query.filter(Order.total_amount >= filters.min_amount)
            if filters.max_amount:
                query = query.filter(Order.total_amount <= filters.max_amount)

        total = query.count()
        orders = query.order_by(desc(Order.created_at)).offset(skip).limit(limit).all()

        return {
            "orders": orders,
            "total": total,
            "page": skip // limit + 1,
            "size": limit,
            "pages": (total + limit - 1) // limit
        }

    async def update_order_status(
        self, 
        db: Session, 
        order_id: UUID, 
        status_update: OrderUpdate
    ) -> Order:
        """Update order status"""
        order = await self.get_order(db, order_id)
        
        if status_update.status:
            order.status = status_update.status
        if status_update.payment_status:
            order.payment_status = status_update.payment_status
        if status_update.tracking_number:
            order.tracking_number = status_update.tracking_number
        if status_update.estimated_delivery:
            order.estimated_delivery = status_update.estimated_delivery
        if status_update.delivered_at:
            order.delivered_at = status_update.delivered_at

        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)

        # Send status update notification
        await self._send_notification(order.user_id, order.id, "status_update")

        return order

    async def process_payment(
        self, 
        db: Session, 
        payment_request: PaymentRequest
    ) -> Dict[str, Any]:
        """Process payment for an order"""
        order = await self.get_order(db, payment_request.order_id)
        
        if order.payment_status == PaymentStatus.PAID:
            return {
                "success": True,
                "message": "Payment already processed",
                "payment_status": PaymentStatus.PAID
            }

        # Mock payment processing
        # In a real application, this would integrate with payment gateways
        try:
            # Simulate payment processing
            import random
            import time
            time.sleep(1)  # Simulate processing time
            
            if random.random() > 0.1:  # 90% success rate
                order.payment_status = PaymentStatus.PAID
                order.status = OrderStatus.CONFIRMED
                order.updated_at = datetime.utcnow()
                db.commit()
                
                # Send payment confirmation notification
                await self._send_notification(order.user_id, order.id, "payment_confirmation")
                
                return {
                    "success": True,
                    "transaction_id": f"TXN-{uuid4().hex[:16].upper()}",
                    "message": "Payment processed successfully",
                    "payment_status": PaymentStatus.PAID
                }
            else:
                order.payment_status = PaymentStatus.FAILED
                order.updated_at = datetime.utcnow()
                db.commit()
                
                return {
                    "success": False,
                    "message": "Payment failed",
                    "payment_status": PaymentStatus.FAILED
                }
        except Exception as e:
            logger.error(f"Payment processing error: {e}")
            raise PaymentFailedError("Payment processing failed")

    async def checkout_from_cart(
        self, 
        db: Session, 
        checkout_data: CheckoutRequest, 
        user_id: UUID, 
        user_token: str
    ) -> Order:
        """Checkout from cart"""
        # Get user's cart
        cart = await self.get_cart(db, user_id=user_id)
        cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
        
        if not cart_items:
            raise CartNotFoundError("Cart is empty")

        # Convert cart items to order items
        order_items = []
        for cart_item in cart_items:
            order_items.append({
                "product_id": cart_item.product_id,
                "quantity": cart_item.quantity
            })

        # Create order
        order_data = OrderCreate(
            user_id=user_id,
            items=order_items,
            shipping_address=checkout_data.shipping_address,
            billing_address=checkout_data.billing_address,
            shipping_phone=checkout_data.shipping_phone,
            shipping_email=checkout_data.shipping_email,
            payment_method=checkout_data.payment_method
        )

        order = await self.create_order(db, order_data, user_token)

        # Clear cart after successful order creation
        await self.clear_cart(db, user_id=user_id)

        return order

    async def cancel_order(self, db: Session, order_id: UUID, user_id: UUID) -> Order:
        """Cancel an order"""
        order = await self.get_order(db, order_id, user_id)
        
        if order.status in [OrderStatus.DELIVERED, OrderStatus.SHIPPED]:
            raise ValueError("Cannot cancel order that is already shipped or delivered")
        
        if order.status == OrderStatus.CANCELLED:
            raise ValueError("Order is already cancelled")

        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)

        # Restore product stock
        for item in order.items:
            await self._update_product_stock(item.product_id, item.quantity)

        # Send cancellation notification
        await self._send_notification(order.user_id, order.id, "order_cancellation")

        return order

    async def get_order_statistics(self, db: Session, user_id: UUID) -> Dict[str, Any]:
        """Get order statistics for a user"""
        total_orders = db.query(Order).filter(Order.user_id == user_id).count()
        total_spent = db.query(func.sum(Order.total_amount)).filter(
            and_(Order.user_id == user_id, Order.payment_status == PaymentStatus.PAID)
        ).scalar() or 0.0
        
        recent_orders = db.query(Order).filter(
            and_(
                Order.user_id == user_id,
                Order.created_at >= datetime.utcnow() - timedelta(days=30)
            )
        ).count()

        return {
            "total_orders": total_orders,
            "total_spent": total_spent,
            "recent_orders": recent_orders
        }


order_service = OrderService() 