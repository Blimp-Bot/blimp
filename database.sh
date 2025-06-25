#!/bin/bash

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Container configuration
CONTAINER_NAME="blimp-postgres"
DB_USERNAME="postgres"
DB_NAME="postgres"
DB_PORT="5432"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ SUCCESS:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
}

print_error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
}

print_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

print_connection_info() {
    echo -e "${CYAN}🔗 CONNECTION INFO:${NC} $1"
}

# Generate random password (16 characters, alphanumeric + special chars)
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-16
}

print_header "PostgreSQL Docker Container Setup"
echo "=================================="

# Check if Docker is running
print_info "Checking Docker status..."
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi
print_success "Docker is running"

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_warning "Container '${CONTAINER_NAME}' already exists"
    read -p "Do you want to remove it and create a new one? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Stopping and removing existing container..."
        docker stop ${CONTAINER_NAME} >/dev/null 2>&1
        docker rm ${CONTAINER_NAME} >/dev/null 2>&1
        print_success "Existing container removed"
    else
        print_info "Exiting without changes"
        exit 0
    fi
fi

# Generate random password
print_info "Generating random password..."
DB_PASSWORD=$(generate_password)
print_success "Password generated"

# Pull PostgreSQL image
print_info "Pulling PostgreSQL Docker image..."
if docker pull postgres:15-alpine >/dev/null 2>&1; then
    print_success "PostgreSQL image pulled successfully"
else
    print_error "Failed to pull PostgreSQL image"
    exit 1
fi

# Create and start container
print_info "Creating PostgreSQL container..."
if docker run -d \
    --name ${CONTAINER_NAME} \
    -e POSTGRES_USER=${DB_USERNAME} \
    -e POSTGRES_PASSWORD=${DB_PASSWORD} \
    -e POSTGRES_DB=${DB_NAME} \
    -p ${DB_PORT}:5432 \
    --restart unless-stopped \
    postgres:15-alpine >/dev/null 2>&1; then
    print_success "Container '${CONTAINER_NAME}' created and started"
else
    print_error "Failed to create container"
    exit 1
fi

# Check container status
print_info "Checking container status..."
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_success "Container is running"
elif docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    print_warning "Container exists but is not running. Starting it..."
    docker start ${CONTAINER_NAME} >/dev/null 2>&1
    print_success "Container started"
else
    print_error "Container setup failed"
    exit 1
fi

# Display connection information
echo
print_header "🎉 Setup Complete!"
echo "==================="
echo
print_connection_info "Container Name: ${CONTAINER_NAME}"
print_connection_info "Database Name: ${DB_NAME}"
print_connection_info "Username: ${DB_USERNAME}"
print_connection_info "Password: ${DB_PASSWORD}"
print_connection_info "Port: ${DB_PORT}"
echo
print_connection_info "Full Connection URL:"
echo -e "${CYAN}postgresql://${DB_USERNAME}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}${NC}"
echo

print_success "PostgreSQL container is ready for use!"

# Save DATABASE_URL to .env file
read -p "Do you want to save DATABASE_URL to .env file? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}"
    
    if [ -f ".env" ]; then
        # Check if DATABASE_URL already exists in .env
        if grep -q "^DATABASE_URL=" .env; then
            print_warning "DATABASE_URL already exists in .env file"
            read -p "Do you want to update it? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                # Update existing DATABASE_URL
                sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env
                print_success "DATABASE_URL updated in .env file"
            else
                print_info "DATABASE_URL not updated"
            fi
        else
            # Add DATABASE_URL to existing .env
            echo "DATABASE_URL=${DATABASE_URL}" >> .env
            print_success "DATABASE_URL added to existing .env file"
        fi
    else
        # Create new .env file
        echo "DATABASE_URL=${DATABASE_URL}" > .env
        print_success "New .env file created with DATABASE_URL"
    fi
fi