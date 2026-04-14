#!/usr/bin/env python3
"""
Backend API Testing for Chess App
Tests REST endpoints and basic functionality
"""

import requests
import sys
import json
from datetime import datetime

class ChessAPITester:
    def __init__(self, base_url="https://socket-chess.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.room_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            else:
                print(f"❌ Unsupported method: {method}")
                return False, {}

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return True, response_data
                except:
                    print(f"   Response: {response.text}")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_server_status(self):
        """Test GET /api/ - server running message"""
        success, response = self.run_test(
            "Server Status",
            "GET",
            "",
            200
        )
        if success and response.get('message'):
            print(f"   Server message: {response['message']}")
            return True
        return False

    def test_create_room(self):
        """Test POST /api/room/create - creates room and returns roomId"""
        success, response = self.run_test(
            "Create Room",
            "POST",
            "room/create",
            200
        )
        if success and 'roomId' in response:
            self.room_id = response['roomId']
            print(f"   Created room: {self.room_id}")
            return True
        return False

    def test_get_room_exists(self):
        """Test GET /api/room/{roomId} - get existing room state"""
        if not self.room_id:
            print("❌ No room ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Existing Room",
            "GET",
            f"room/{self.room_id}",
            200
        )
        if success and response.get('exists') == True:
            state = response.get('state', {})
            print(f"   Room exists: {response['exists']}")
            print(f"   FEN: {state.get('fen', 'N/A')}")
            print(f"   Turn: {state.get('turn', 'N/A')}")
            print(f"   Status: {state.get('status', 'N/A')}")
            return True
        return False

    def test_get_room_nonexistent(self):
        """Test GET /api/room/{roomId} - get non-existent room"""
        fake_room_id = "nonexistent123"
        success, response = self.run_test(
            "Get Non-existent Room",
            "GET",
            f"room/{fake_room_id}",
            200
        )
        if success and response.get('exists') == False:
            print(f"   Room exists: {response['exists']} (expected)")
            return True
        return False

    def test_cors_headers(self):
        """Test CORS headers are present"""
        url = f"{self.base_url}/"
        print(f"\n🔍 Testing CORS Headers...")
        print(f"   URL: {url}")
        
        try:
            response = requests.options(url, timeout=10)
            headers = response.headers
            
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            ]
            
            found_cors = []
            for header in cors_headers:
                if header in headers:
                    found_cors.append(f"{header}: {headers[header]}")
            
            if found_cors:
                print("✅ CORS headers found:")
                for header in found_cors:
                    print(f"   {header}")
                self.tests_passed += 1
            else:
                print("⚠️  No CORS headers found in OPTIONS response")
                
            self.tests_run += 1
            return len(found_cors) > 0
            
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.tests_run += 1
            return False

def main():
    print("=" * 60)
    print("🏁 Chess App Backend API Testing")
    print("=" * 60)
    
    # Setup
    tester = ChessAPITester()
    
    # Run all tests
    tests = [
        tester.test_server_status,
        tester.test_create_room,
        tester.test_get_room_exists,
        tester.test_get_room_nonexistent,
        tester.test_cors_headers,
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())