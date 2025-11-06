# Python sample code
def greet(name):
    message = f"Hello, {name}!"
    print(message)
    return message

class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def say_hello(self):
        return f"Hi, I'm {self.name}"

person = Person("Alice", 30)
greet(person.name)

# Keywords: def, class, return, print
# Strings: "Hello, {name}!", "Hi, I'm {self.name}", "Alice"
# Comments: # Python sample code, # Keywords: ...
# Functions: greet, say_hello, __init__
# Variables: message, person, name, age
# Numbers: 30
# Operators: =, ., f"", !
# Classes: Person
# Constants: none