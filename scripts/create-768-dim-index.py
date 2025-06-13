# Script to create a new Pinecone index with 768 dimensions
# This matches the CLIP embedding dimension we're getting

import os
from pinecone import Pinecone

# Initialize Pinecone
pc = Pinecone(api_key=os.environ.get('PINECONE_API_KEY'))

# Create a new index with 768 dimensions
index_name = "lens-tool-768"

try:
    # Check if index already exists
    existing_indexes = [index.name for index in pc.list_indexes()]
    
    if index_name in existing_indexes:
        print(f"Index '{index_name}' already exists!")
    else:
        # Create new index
        pc.create_index(
            name=index_name,
            dimension=768,  # Match the CLIP embedding dimension
            metric="cosine",
            spec={
                "serverless": {
                    "cloud": "aws",
                    "region": "us-east-1"
                }
            }
        )
        print(f"✅ Created new index '{index_name}' with 768 dimensions")
        
    # List all indexes
    print("\nAvailable indexes:")
    for index in pc.list_indexes():
        print(f"- {index.name}: {index.dimension} dimensions")
        
except Exception as e:
    print(f"❌ Error: {e}")
