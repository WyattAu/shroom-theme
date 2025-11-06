// Go sample code
package main

import "fmt"

func greet(name string) string {
    message := fmt.Sprintf("Hello, %s!", name)
    fmt.Println(message)
    return message
}

type Person struct {
    Name string
    Age  int
}

func (p Person) SayHello() string {
    return fmt.Sprintf("Hi, I'm %s", p.Name)
}

func main() {
    person := Person{Name: "Alice", Age: 30}
    greet(person.Name)
}

// Keywords: package, import, func, type, return, fmt
// Strings: "Hello, %s!", "Hi, I'm %s", "Alice"
// Comments: // Go sample code, // Keywords: ...
// Functions: greet, SayHello, main
// Variables: message, person, name, Name, Age
// Numbers: 30
// Operators: =, ., :, !, %s
// Classes: Person (struct)
// Constants: none