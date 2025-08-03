import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.order_service import OrderService
from app.models.order import Order, OrderItem, Cart, CartItem
from app.schemas.order import CartItemCreate, OrderCreate, PaymentDetails


class TestOrderService:
    @pytest.fixture
    def mock_db(self):
        return Mock(spec=Session)
    
    @pytest.fixture
    def order_service(self, mock_db):
        return OrderService(mock_db)
    
    @pytest.fixture
    def sample_cart_item(self):
        return CartItemCreate(
            productId="507f1f77bcf86cd799439012",
            quantity=2
        )
    
    @pytest.fixture
    def sample_order_data(self):
        return OrderCreate(
            shippingAddress={
                "street": "123 Main St",
                "city": "Mumbai",
                "state": "Maharashtra",
                "postalCode": "400001",
                "country": "India"
            },
            paymentMethod="credit_card",
            paymentDetails={
                "cardNumber": "**** **** **** 1234",
                "expiryDate": "12/25"
            }
        )

    @pytest.mark.asyncio
    async def test_add_to_cart_success(self, order_service, sample_cart_item, mock_db):
        # Mock product service response
        mock_product = {
            "id": "507f1f77bcf86cd799439012",
            "name": "iPhone 15 Pro",
            "price": 99999,
            "stock": 50,
            "images": ["https://example.com/iphone15pro1.jpg"]
        }
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=200, json=lambda: mock_product)
            
            # Mock database operations
            mock_db.query.return_value.filter.return_value.first.return_value = None
            mock_cart = Cart(id=1, userId=1)
            mock_db.add.return_value = None
            mock_db.commit.return_value = None
            mock_db.refresh.return_value = None
            
            result = await order_service.add_to_cart(1, sample_cart_item)
            
            assert result["success"] is True
            assert result["message"] == "Item added to cart successfully"
            assert result["data"]["productId"] == sample_cart_item.productId
            assert result["data"]["quantity"] == sample_cart_item.quantity

    @pytest.mark.asyncio
    async def test_add_to_cart_product_not_found(self, order_service, sample_cart_item):
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=404)
            
            with pytest.raises(Exception, match="Product not found"):
                await order_service.add_to_cart(1, sample_cart_item)

    @pytest.mark.asyncio
    async def test_add_to_cart_insufficient_stock(self, order_service, sample_cart_item):
        mock_product = {
            "id": "507f1f77bcf86cd799439012",
            "name": "iPhone 15 Pro",
            "price": 99999,
            "stock": 1,  # Less than requested quantity
            "images": ["https://example.com/iphone15pro1.jpg"]
        }
        
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=200, json=lambda: mock_product)
            
            with pytest.raises(Exception, match="Insufficient stock"):
                await order_service.add_to_cart(1, sample_cart_item)

    @pytest.mark.asyncio
    async def test_get_cart_success(self, order_service, mock_db):
        mock_cart_items = [
            CartItem(
                id=1,
                cartId=1,
                productId="507f1f77bcf86cd799439012",
                productName="iPhone 15 Pro",
                price=99999,
                quantity=2,
                totalPrice=199998,
                image="https://example.com/iphone15pro1.jpg"
            )
        ]
        
        mock_db.query.return_value.filter.return_value.first.return_value = Mock(id=1, userId=1)
        mock_db.query.return_value.filter.return_value.all.return_value = mock_cart_items
        
        result = await order_service.get_cart(1)
        
        assert result["success"] is True
        assert len(result["data"]["items"]) == 1
        assert result["data"]["items"][0]["productName"] == "iPhone 15 Pro"

    @pytest.mark.asyncio
    async def test_update_cart_item_success(self, order_service, mock_db):
        mock_cart_item = CartItem(
            id=1,
            cartId=1,
            productId="507f1f77bcf86cd799439012",
            productName="iPhone 15 Pro",
            price=99999,
            quantity=2,
            totalPrice=199998
        )
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_cart_item
        mock_db.commit.return_value = None
        
        result = await order_service.update_cart_item(1, 1, 3)
        
        assert result["success"] is True
        assert result["data"]["quantity"] == 3
        assert result["data"]["totalPrice"] == 299997

    @pytest.mark.asyncio
    async def test_remove_from_cart_success(self, order_service, mock_db):
        mock_cart_item = CartItem(id=1, cartId=1)
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_cart_item
        mock_db.delete.return_value = None
        mock_db.commit.return_value = None
        
        result = await order_service.remove_from_cart(1, 1)
        
        assert result["success"] is True
        assert result["message"] == "Item removed from cart successfully"

    @pytest.mark.asyncio
    async def test_create_order_success(self, order_service, sample_order_data, mock_db):
        # Mock cart with items
        mock_cart = Mock(id=1, userId=1)
        mock_cart_items = [
            CartItem(
                id=1,
                cartId=1,
                productId="507f1f77bcf86cd799439012",
                productName="iPhone 15 Pro",
                price=99999,
                quantity=2,
                totalPrice=199998
            )
        ]
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_cart
        mock_db.query.return_value.filter.return_value.all.return_value = mock_cart_items
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None
        
        # Mock payment processing
        with patch.object(order_service, '_process_payment') as mock_payment:
            mock_payment.return_value = {"status": "success", "transactionId": "txn_123"}
            
            # Mock notification service
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_post.return_value = Mock(status_code=200)
                
                result = await order_service.create_order(1, sample_order_data)
                
                assert result["success"] is True
                assert result["message"] == "Order created successfully"
                assert result["data"]["status"] == "pending"
                assert result["data"]["totalAmount"] == 199998

    @pytest.mark.asyncio
    async def test_create_order_empty_cart(self, order_service, sample_order_data, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = Mock(id=1, userId=1)
        mock_db.query.return_value.filter.return_value.all.return_value = []
        
        with pytest.raises(Exception, match="Cart is empty"):
            await order_service.create_order(1, sample_order_data)

    @pytest.mark.asyncio
    async def test_get_user_orders_success(self, order_service, mock_db):
        mock_orders = [
            Order(
                id=1,
                userId=1,
                status="delivered",
                totalAmount=199998,
                shippingAddress={"city": "Mumbai"},
                paymentMethod="credit_card"
            )
        ]
        
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_orders
        
        result = await order_service.get_user_orders(1, 1, 10)
        
        assert result["success"] is True
        assert len(result["data"]["orders"]) == 1
        assert result["data"]["orders"][0]["status"] == "delivered"

    @pytest.mark.asyncio
    async def test_get_order_by_id_success(self, order_service, mock_db):
        mock_order = Order(
            id=1,
            userId=1,
            status="pending",
            totalAmount=199998,
            shippingAddress={"city": "Mumbai"},
            paymentMethod="credit_card"
        )
        
        mock_order_items = [
            OrderItem(
                id=1,
                orderId=1,
                productId="507f1f77bcf86cd799439012",
                productName="iPhone 15 Pro",
                price=99999,
                quantity=2,
                totalPrice=199998
            )
        ]
        
        mock_db.query.return_value.filter.return_value.first.side_effect = [mock_order, mock_order_items[0]]
        mock_db.query.return_value.filter.return_value.all.return_value = mock_order_items
        
        result = await order_service.get_order_by_id(1, 1)
        
        assert result["success"] is True
        assert result["data"]["id"] == 1
        assert result["data"]["status"] == "pending"
        assert len(result["data"]["items"]) == 1

    @pytest.mark.asyncio
    async def test_get_order_by_id_not_found(self, order_service, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        with pytest.raises(Exception, match="Order not found"):
            await order_service.get_order_by_id(1, 999)

    @pytest.mark.asyncio
    async def test_update_order_status_success(self, order_service, mock_db):
        mock_order = Order(
            id=1,
            userId=1,
            status="pending",
            totalAmount=199998
        )
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_order
        mock_db.commit.return_value = None
        
        result = await order_service.update_order_status(1, 1, "shipped")
        
        assert result["success"] is True
        assert result["data"]["status"] == "shipped"

    @pytest.mark.asyncio
    async def test_process_payment_credit_card_success(self, order_service):
        payment_details = PaymentDetails(
            cardNumber="**** **** **** 1234",
            expiryDate="12/25"
        )
        
        result = await order_service._process_payment("credit_card", payment_details, 199998)
        
        assert result["status"] == "success"
        assert "transactionId" in result

    @pytest.mark.asyncio
    async def test_process_payment_upi_success(self, order_service):
        payment_details = PaymentDetails(upiId="user@upi")
        
        result = await order_service._process_payment("upi", payment_details, 199998)
        
        assert result["status"] == "success"
        assert "transactionId" in result

    @pytest.mark.asyncio
    async def test_process_payment_cod_success(self, order_service):
        payment_details = PaymentDetails()
        
        result = await order_service._process_payment("cod", payment_details, 199998)
        
        assert result["status"] == "pending"
        assert result["message"] == "Payment will be collected on delivery"

    @pytest.mark.asyncio
    async def test_process_payment_invalid_method(self, order_service):
        payment_details = PaymentDetails()
        
        with pytest.raises(Exception, match="Invalid payment method"):
            await order_service._process_payment("invalid_method", payment_details, 199998)

    @pytest.mark.asyncio
    async def test_send_order_notification_success(self, order_service):
        order_data = {
            "id": 1,
            "userId": 1,
            "status": "pending",
            "totalAmount": 199998
        }
        
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_post.return_value = Mock(status_code=200)
            
            await order_service._send_order_notification(order_data, "order_confirmation")
            
            mock_post.assert_called_once()

    @pytest.mark.asyncio
    async def test_validate_user_success(self, order_service):
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=200, json=lambda: {"id": 1, "username": "test"})
            
            result = await order_service._validate_user("valid_token")
            
            assert result is True

    @pytest.mark.asyncio
    async def test_validate_user_invalid_token(self, order_service):
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value = Mock(status_code=401)
            
            result = await order_service._validate_user("invalid_token")
            
            assert result is False

    @pytest.mark.asyncio
    async def test_get_order_tracking_success(self, order_service, mock_db):
        mock_order = Order(
            id=1,
            userId=1,
            status="shipped",
            trackingNumber="TRK123456789"
        )
        
        mock_db.query.return_value.filter.return_value.first.return_value = mock_order
        
        result = await order_service.get_order_tracking(1, 1)
        
        assert result["success"] is True
        assert result["data"]["trackingNumber"] == "TRK123456789"
        assert result["data"]["status"] == "shipped"

    @pytest.mark.asyncio
    async def test_clear_cart_success(self, order_service, mock_db):
        mock_cart_items = [
            CartItem(id=1, cartId=1),
            CartItem(id=2, cartId=1)
        ]
        
        mock_db.query.return_value.filter.return_value.first.return_value = Mock(id=1, userId=1)
        mock_db.query.return_value.filter.return_value.all.return_value = mock_cart_items
        mock_db.delete.return_value = None
        mock_db.commit.return_value = None
        
        result = await order_service.clear_cart(1)
        
        assert result["success"] is True
        assert result["message"] == "Cart cleared successfully" 